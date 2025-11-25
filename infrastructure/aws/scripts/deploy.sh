#!/bin/bash
###############################################################################
# OnQuota AWS Deployment Script
# Deploys the infrastructure using AWS CDK
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="dev"
REGION="us-east-1"
PROFILE="default"
AUTO_APPROVE="false"

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to display usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy OnQuota infrastructure to AWS

OPTIONS:
    -e, --environment   Environment to deploy (dev|staging|production) [default: dev]
    -r, --region        AWS region [default: us-east-1]
    -p, --profile       AWS profile to use [default: default]
    -y, --yes          Auto-approve deployment
    -h, --help         Display this help message

EXAMPLES:
    $0 -e dev
    $0 -e production -r us-west-2 -p prod
    $0 -e staging --yes

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
        -y|--yes)
            AUTO_APPROVE="true"
            shift
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

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|production)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    usage
fi

print_info "Starting OnQuota deployment"
print_info "Environment: $ENVIRONMENT"
print_info "Region: $REGION"
print_info "AWS Profile: $PROFILE"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity --profile $PROFILE &> /dev/null; then
    print_error "AWS credentials not configured for profile: $PROFILE"
    exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --profile $PROFILE --query Account --output text)
print_info "AWS Account ID: $AWS_ACCOUNT_ID"

# Navigate to CDK directory
cd "$(dirname "$0")/../cdk" || exit 1

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_info "Installing CDK dependencies..."
    npm install
fi

# Build TypeScript
print_info "Building CDK project..."
npm run build

# Set environment variables
export AWS_ACCOUNT_ID=$AWS_ACCOUNT_ID
export AWS_REGION=$REGION
export ENVIRONMENT=$ENVIRONMENT

# Bootstrap CDK if needed
print_info "Checking CDK bootstrap..."
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --profile $PROFILE --region $REGION &> /dev/null; then
    print_warning "CDK not bootstrapped. Bootstrapping now..."
    npx cdk bootstrap aws://$AWS_ACCOUNT_ID/$REGION --profile $PROFILE
fi

# Synthesize CloudFormation templates
print_info "Synthesizing CloudFormation templates..."
npx cdk synth --context environment=$ENVIRONMENT --profile $PROFILE

# Deploy
if [ "$AUTO_APPROVE" = "true" ]; then
    print_info "Deploying infrastructure (auto-approved)..."
    npx cdk deploy --all \
        --context environment=$ENVIRONMENT \
        --profile $PROFILE \
        --require-approval never
else
    print_info "Deploying infrastructure..."
    npx cdk deploy --all \
        --context environment=$ENVIRONMENT \
        --profile $PROFILE
fi

print_info "Deployment completed successfully!"

# Get outputs
print_info "Retrieving stack outputs..."

STACK_PREFIX="onquota-$ENVIRONMENT"

# Get ALB DNS
ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_PREFIX}-ecs \
    --profile $PROFILE \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ALBDnsName`].OutputValue' \
    --output text 2>/dev/null || echo "N/A")

# Get ECR repositories
BACKEND_REPO=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_PREFIX}-ecs \
    --profile $PROFILE \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`BackendRepoUri`].OutputValue' \
    --output text 2>/dev/null || echo "N/A")

FRONTEND_REPO=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_PREFIX}-ecs \
    --profile $PROFILE \
    --region $REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendRepoUri`].OutputValue' \
    --output text 2>/dev/null || echo "N/A")

# Print summary
cat << EOF

===============================================
        DEPLOYMENT SUMMARY
===============================================

Environment:        $ENVIRONMENT
Region:             $REGION
Account ID:         $AWS_ACCOUNT_ID

Application Load Balancer:
  DNS: $ALB_DNS
  URL: http://$ALB_DNS

ECR Repositories:
  Backend:  $BACKEND_REPO
  Frontend: $FRONTEND_REPO

Next Steps:
1. Push Docker images to ECR repositories
2. Configure Route53 DNS records (if using custom domain)
3. Set up SSL certificates with ACM
4. Configure secrets in AWS Secrets Manager
5. Run database migrations

For more information, see docs/AWS_DEPLOYMENT.md

===============================================

EOF

print_info "Deployment script completed!"
