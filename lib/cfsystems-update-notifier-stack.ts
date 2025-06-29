import { aws_sns as sns, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CfSystemsUpdateNotifierStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Optional: only if your CDK system uses this topic elsewhere
        new sns.Topic(this, 'CFSystemsUpdatesTopic', {
            topicName: 'CFSystemsUpdatesTopic'
        });
    }
}
