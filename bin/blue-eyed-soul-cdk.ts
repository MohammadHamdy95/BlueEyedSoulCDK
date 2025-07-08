#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BlueEyedSoulPipelineStack } from '../lib/blue-eyed-soul-cdk-pipeline';
import {BlueEyedCodeS3BucketsStack} from "../lib/blue-eyed-code-s3-stack";
import {BlueEyedSoulSchedulerStack} from "../lib/blue-eyed-soul-scheduler-stack";
import {ProcessingLambdaSchedulerStack} from "../lib/processing-lambda-scheduler-stack";
import {BlueEyedSoulDdbStack} from "../lib/blue-eyed-soul-ddb-stack";
import {BlueEyedSoulSNSStack} from "../lib/blue-eyed-soul-s-n-s-stack";

const app = new cdk.App();
//I don't want this anymore.
// new BlueEyedSoulPipelineStack(app, 'BlueEyedSoulLambdaPipeline', {});

new BlueEyedCodeS3BucketsStack(app, 'BlueEyedCodeS3BucketsStack', {})

new BlueEyedSoulSchedulerStack(app, 'BlueEyedSoulSchedulerStack', {})

new ProcessingLambdaSchedulerStack(app, 'ProcessingLambdaSchedulerStack', {})

new BlueEyedSoulDdbStack(app, 'BlueEyedSoulDdbStack', {})

new BlueEyedSoulSNSStack(app, 'BlueEyedSoulSNSStack', {})