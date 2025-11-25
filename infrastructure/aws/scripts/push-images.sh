#!/bin/bash
###############################################################################
# OnQuota Docker Images Push Script
# Builds and pushes Docker images to AWS ECR
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
SERVICE="all"

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

Build and push Docker images to AWS ECR

OPTIONS:
    -e, --environment   Environment (dev|staging|production) [default: dev]
    -r, --region        AWS region [default: us-east-1]
    -p, --profile       AWS profile to use [default: default]
    -s, --service       Service to build (backend|frontend|all) [default: all]
    -h, --help          Display this help message

EXAMPLES:
    $0 -e dev
    $0 -e production -s backend
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
        -s|--service)
            SERVICE="$2"
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

print_info "Pushing Docker images for environment: $ENVIRONMENT"

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --profile $PROFILE --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

print_info "ECR Registry: $ECR_REGISTRY"

# Login to ECR
print_info "Logging in to Amazon ECR..."
aws ecr get-login-password --profile $PROFILE --region $REGION | \
    docker login --username AWS --password-stdin $ECR_REGISTRY

# Get project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

# Function to build and push image
build_and_push() {
    local service=$1
    local context=$2
    local dockerfile=$3

    print_info "Building $service image..."

    REPO_URI="${ECR_REGISTRY}/onquota-${ENVIRONMENT}-${service}"
    IMAGE_TAG="latest"

    # Build image
    docker build \
        -t ${service}:${IMAGE_TAG} \
        -f ${dockerfile} \
        ${context}

    # Tag for ECR
    docker tag ${service}:${IMAGE_TAG} ${REPO_URI}:${IMAGE_TAG}
    docker tag ${service}:${IMAGE_TAG} ${REPO_URI}:$(git rev-parse --short HEAD)

    # Push to ECR
    print_info "Pushing $service image to ECR..."
    docker push ${REPO_URI}:${IMAGE_TAG}
    docker push ${REPO_URI}:$(git rev-parse --short HEAD)

    print_info "$service image pushed successfully!"
}

# Build and push based on service selection
if [ "$SERVICE" = "backend" ] || [ "$SERVICE" = "all" ]; then
    build_and_push "backend" "${PROJECT_ROOT}/backend" "${PROJECT_ROOT}/backend/Dockerfile.aws"
fi

if [ "$SERVICE" = "frontend" ] || [ "$SERVICE" = "all" ]; then
    build_and_push "frontend" "${PROJECT_ROOT}/frontend" "${PROJECT_ROOT}/frontend/Dockerfile.aws"
fi

print_info "All images pushed successfully!"

# Print summary
cat << EOF

===============================================
        IMAGE PUSH SUMMARY
===============================================

Environment:    $ENVIRONMENT
Region:         $REGION
Registry:       $ECR_REGISTRY

Images pushed:
EOF

if [ "$SERVICE" = "backend" ] || [ "$SERVICE" = "all" ]; then
    echo "  - ${ECR_REGISTRY}/onquota-${ENVIRONMENT}-backend:latest"
fi

if [ "$SERVICE" = "frontend" ] || [ "$SERVICE" = "all" ]; then
    echo "  - ${ECR_REGISTRY}/onquota-${ENVIRONMENT}-frontend:latest"
fi

cat << EOF

Next steps:
1. Update ECS services to use new images:
   aws ecs update-service --cluster onquota-${ENVIRONMENT}-cluster \\
       --service onquota-${ENVIRONMENT}-backend --force-new-deployment

2. Monitor deployment in ECS console

===============================================

EOF
