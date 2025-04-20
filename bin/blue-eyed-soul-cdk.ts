#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BlueEyedSoulPipelineStack } from '../lib/blue-eyed-soul-cdk-pipeline';
import {BlueEyedCodeS3BucketsStack} from "../lib/blue-eyed-code-s3-stack";
import {BlueEyedSoulSchedulerStack} from "../lib/blue-eyed-sould-scheduler-stack";

const app = new cdk.App();
new BlueEyedSoulPipelineStack(app, 'BlueEyedSoulLambdaPipeline', {});

new BlueEyedCodeS3BucketsStack(app, 'BlueEyedCodeS3BucketsStack', {})

new BlueEyedSoulSchedulerStack(app, 'BlueEyedSoulSchedulerStack', {})