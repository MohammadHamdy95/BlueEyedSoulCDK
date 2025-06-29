// lambda-s3-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class BlueEyedCodeS3BucketsStack extends cdk.Stack {
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

        // ✅ New bucket for storing published messages by day
        new s3.Bucket(this, 'ProcessingUpdatesBucket', {
            bucketName: 'blue-eyed-soul-processing-updates',
            removalPolicy: cdk.RemovalPolicy.RETAIN, // safer for logs/data
            versioned: true,
            lifecycleRules: [
                {
                    expiration: cdk.Duration.days(365) // optional: auto-delete after 1 year
                }
            ]
        });
    }
}
