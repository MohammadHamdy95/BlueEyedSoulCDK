#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BlueEyedSoulPipelineStack } from '../lib/blue-eyed-soul-cdk-pipeline';

const app = new cdk.App();
new BlueEyedSoulPipelineStack(app, 'BlueEyedSoulLambdaPipeline', {
});