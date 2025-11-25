#!/usr/bin/env node
/**
 * OnQuota AWS CDK Application Entry Point
 * Orchestrates the creation of all infrastructure stacks
 */

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/stacks/vpc-stack';
import { DatabaseStack } from '../lib/stacks/database-stack';
import { StorageStack } from '../lib/stacks/storage-stack';
import { EcsStack } from '../lib/stacks/ecs-stack';
import { MonitoringStack } from '../lib/stacks/monitoring-stack';
import { getConfig } from '../lib/config/environments';

// Get environment from context or default to dev
const environment = process.env.ENVIRONMENT || 'dev';
const config = getConfig(environment);

console.log(`Deploying OnQuota infrastructure for environment: ${environment}`);
console.log(`Region: ${config.region}`);
console.log(`Account: ${config.account}`);

// Create CDK app
const app = new cdk.App();

// Stack naming convention
const stackPrefix = `${config.projectName}-${config.environment}`;

// Common stack props
const stackProps = {
  env: {
    account: config.account,
    region: config.region,
  },
  config,
};

// 1. VPC Stack - Network foundation
const vpcStack = new VpcStack(app, `${stackPrefix}-vpc`, stackProps);

// 2. Storage Stack - S3 and CloudFront
const storageStack = new StorageStack(app, `${stackPrefix}-storage`, stackProps);

// 3. Database Stack - RDS and ElastiCache
const databaseStack = new DatabaseStack(app, `${stackPrefix}-database`, {
  ...stackProps,
  vpc: vpcStack.vpc,
  rdsSecurityGroup: vpcStack.rdsSecurityGroup,
  elasticacheSecurityGroup: vpcStack.elasticacheSecurityGroup,
});
databaseStack.addDependency(vpcStack);

// 4. ECS Stack - Application services
const ecsStack = new EcsStack(app, `${stackPrefix}-ecs`, {
  ...stackProps,
  vpc: vpcStack.vpc,
  ecsSecurityGroup: vpcStack.ecsSecurityGroup,
  albSecurityGroup: vpcStack.albSecurityGroup,
  rdsCredentials: databaseStack.rdsCredentials,
  rdsEndpoint: databaseStack.rdsInstance.instanceEndpoint.hostname,
  redisEndpoint: databaseStack.elasticacheCluster.attrPrimaryEndPointAddress,
  uploadsBucket: storageStack.uploadsBucket,
});
ecsStack.addDependency(vpcStack);
ecsStack.addDependency(databaseStack);
ecsStack.addDependency(storageStack);

// 5. Monitoring Stack - CloudWatch dashboards and alarms
const monitoringStack = new MonitoringStack(app, `${stackPrefix}-monitoring`, {
  ...stackProps,
  cluster: ecsStack.cluster,
  backendService: ecsStack.backendService,
  frontendService: ecsStack.frontendService,
  celeryWorkerService: ecsStack.celeryWorkerService,
  rdsInstance: databaseStack.rdsInstance,
  applicationLoadBalancer: ecsStack.applicationLoadBalancer,
});
monitoringStack.addDependency(ecsStack);

// Add global tags to all stacks
Object.entries(config.tags).forEach(([key, value]) => {
  cdk.Tags.of(app).add(key, value);
});

// Synthesize the CloudFormation templates
app.synth();

console.log('\n=== OnQuota Infrastructure Stacks ===');
console.log(`1. VPC Stack: ${stackPrefix}-vpc`);
console.log(`2. Storage Stack: ${stackPrefix}-storage`);
console.log(`3. Database Stack: ${stackPrefix}-database`);
console.log(`4. ECS Stack: ${stackPrefix}-ecs`);
console.log(`5. Monitoring Stack: ${stackPrefix}-monitoring`);
console.log('\n=== Deployment Commands ===');
console.log(`Deploy all: npm run deploy:${environment}`);
console.log(`Deploy specific: cdk deploy ${stackPrefix}-<stack-name>`);
console.log(`Destroy all: cdk destroy --all`);
console.log('\n');
