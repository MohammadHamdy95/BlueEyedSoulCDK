// lambda-s3-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class LambdaS3Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        new s3.Bucket(this, 'BlueEyedSoulLambdaCodeBeta', {
            bucketName: 'blue-eyed-soul-lambda-code-beta',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            versioned: true,
        });

        new s3.Bucket(this, 'BlueEyedSoulLambdaCodeProd', {
            bucketName: 'blue-eyed-soul-lambda-code-prod',
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            versioned: true,
        });
    }
}