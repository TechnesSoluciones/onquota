#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { OnQuotaStack } from '../lib/onquota-stack';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = new cdk.App();

// Environment configuration
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-east-1',
};

// Development Stack
new OnQuotaStack(app, 'OnQuotaStack-dev', {
  env,
  environment: 'dev',
  domainName: process.env.DEV_DOMAIN_NAME || 'dev.onquota.com',
  certificateArn: process.env.DEV_CERTIFICATE_ARN,
  enableMultiAz: false,
  enableBackups: true,
  minCapacity: 1,
  maxCapacity: 3,
  databaseInstanceClass: 'db.t4g.micro',
  cacheNodeType: 'cache.t4g.micro',
  tags: {
    Environment: 'dev',
    Project: 'OnQuota',
    ManagedBy: 'CDK',
  },
});

// Staging Stack (optional)
if (process.env.DEPLOY_STAGING === 'true') {
  new OnQuotaStack(app, 'OnQuotaStack-staging', {
    env,
    environment: 'staging',
    domainName: process.env.STAGING_DOMAIN_NAME || 'staging.onquota.com',
    certificateArn: process.env.STAGING_CERTIFICATE_ARN,
    enableMultiAz: true,
    enableBackups: true,
    minCapacity: 2,
    maxCapacity: 5,
    databaseInstanceClass: 'db.t4g.small',
    cacheNodeType: 'cache.t4g.small',
    tags: {
      Environment: 'staging',
      Project: 'OnQuota',
      ManagedBy: 'CDK',
    },
  });
}

// Production Stack
if (process.env.DEPLOY_PRODUCTION === 'true') {
  new OnQuotaStack(app, 'OnQuotaStack-prod', {
    env,
    environment: 'prod',
    domainName: process.env.PROD_DOMAIN_NAME || 'onquota.com',
    certificateArn: process.env.PROD_CERTIFICATE_ARN,
    enableMultiAz: true,
    enableBackups: true,
    minCapacity: 3,
    maxCapacity: 10,
    databaseInstanceClass: 'db.r6g.large',
    cacheNodeType: 'cache.r6g.large',
    enableReadReplica: true,
    backupRetentionDays: 30,
    tags: {
      Environment: 'prod',
      Project: 'OnQuota',
      ManagedBy: 'CDK',
      CostCenter: 'Production',
    },
  });
}

app.synth();
