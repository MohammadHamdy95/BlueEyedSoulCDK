import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { aws_sns as sns } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CfSystemsUpdateNotifierStack extends Stack {
    public readonly cfSystemsUpdatesTopic: sns.Topic;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.cfSystemsUpdatesTopic = new sns.Topic(this, 'CFSystemsUpdatesTopic', {
            topicName: 'CFSystemsUpdatesTopic'
        });

        new CfnOutput(this, 'CFSystemsTopicArn', {
            value: this.cfSystemsUpdatesTopic.topicArn,
            exportName: 'CFSystemsUpdatesTopicArn'
        });
    }
}
