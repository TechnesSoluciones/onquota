#!/bin/bash
###############################################################################
# OnQuota Database Migration Script for AWS
# Runs Alembic migrations on ECS Fargate
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Default values
ENVIRONMENT="dev"
REGION="us-east-1"
PROFILE="default"
MIGRATION_COMMAND="upgrade head"

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Run database migrations for OnQuota on AWS ECS

OPTIONS:
    -e, --environment   Environment (dev|staging|production) [default: dev]
    -r, --region        AWS region [default: us-east-1]
    -p, --profile       AWS profile to use [default: default]
    -c, --command       Migration command [default: upgrade head]
    -h, --help          Display this help message

EXAMPLES:
    $0 -e dev
    $0 -e production -c "downgrade -1"
    $0 -e staging --profile staging-profile

EOF
    exit 1
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -p|--profile)
            PROFILE="$2"
            shift 2
            ;;
        -c|--command)
            MIGRATION_COMMAND="$2"
            shift 2
            ;;
        -h|--help)
            usage
            ;;
        *)
            print_error "Unknown option: $1"
            usage
            ;;
    esac
done

print_info "Running database migration for environment: $ENVIRONMENT"

# Construct resource names
CLUSTER_NAME="onquota-${ENVIRONMENT}-cluster"
TASK_DEF="onquota-${ENVIRONMENT}-backend"
STACK_PREFIX="onquota-${ENVIRONMENT}"

# Get VPC subnets
print_info "Getting VPC configuration..."
SUBNETS=$(aws ec2 describe-subnets \
    --filters "Name=tag:Name,Values=${STACK_PREFIX}-vpc/Private*" \
    --query 'Subnets[*].SubnetId' \
    --output text \
    --profile $PROFILE \
    --region $REGION | tr '\t' ',')

if [ -z "$SUBNETS" ]; then
    print_error "Could not find private subnets"
    exit 1
fi

# Get security group
SECURITY_GROUP=$(aws ec2 describe-security-groups \
    --filters "Name=tag:Name,Values=${STACK_PREFIX}-ecs-sg" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --profile $PROFILE \
    --region $REGION)

if [ -z "$SECURITY_GROUP" ] || [ "$SECURITY_GROUP" = "None" ]; then
    print_error "Could not find ECS security group"
    exit 1
fi

print_info "Cluster: $CLUSTER_NAME"
print_info "Task Definition: $TASK_DEF"
print_info "Subnets: $SUBNETS"
print_info "Security Group: $SECURITY_GROUP"
print_info "Migration Command: $MIGRATION_COMMAND"

# Run migration task
print_info "Starting migration task..."

TASK_ARN=$(aws ecs run-task \
    --cluster $CLUSTER_NAME \
    --task-definition $TASK_DEF \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUP],assignPublicIp=DISABLED}" \
    --overrides "{\"containerOverrides\":[{\"name\":\"backend\",\"command\":[\"alembic\",\"$MIGRATION_COMMAND\"]}]}" \
    --profile $PROFILE \
    --region $REGION \
    --query 'tasks[0].taskArn' \
    --output text)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" = "None" ]; then
    print_error "Failed to start migration task"
    exit 1
fi

print_info "Migration task started: $TASK_ARN"
print_info "Waiting for task to complete..."

# Wait for task to complete
aws ecs wait tasks-stopped \
    --cluster $CLUSTER_NAME \
    --tasks $TASK_ARN \
    --profile $PROFILE \
    --region $REGION

# Check task exit code
EXIT_CODE=$(aws ecs describe-tasks \
    --cluster $CLUSTER_NAME \
    --tasks $TASK_ARN \
    --profile $PROFILE \
    --region $REGION \
    --query 'tasks[0].containers[0].exitCode' \
    --output text)

if [ "$EXIT_CODE" = "0" ]; then
    print_info "Migration completed successfully!"
else
    print_error "Migration failed with exit code: $EXIT_CODE"

    # Get CloudWatch logs
    print_info "Fetching logs..."
    LOG_STREAM=$(aws ecs describe-tasks \
        --cluster $CLUSTER_NAME \
        --tasks $TASK_ARN \
        --profile $PROFILE \
        --region $REGION \
        --query 'tasks[0].containers[0].name' \
        --output text)

    print_error "Check CloudWatch Logs for details: /ecs/${STACK_PREFIX}/backend"
    exit 1
fi
