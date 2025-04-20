#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BlueEyedSoulPipelineStack } from '../lib/blue_eyed_soul_cdk_pipeline';

const app = new cdk.App();
new BlueEyedSoulPipelineStack(app, 'BlueEyedSoulLambdaPipeline', {
});