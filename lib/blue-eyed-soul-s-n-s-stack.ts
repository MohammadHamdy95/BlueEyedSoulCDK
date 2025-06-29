import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import {
    aws_sns as sns,
    aws_sqs as sqs,
    aws_sns_subscriptions as subs
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class BlueEyedSoulSNSStack extends Stack {
    public readonly cfSystemsUpdatesTopic: sns.Topic;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // Create SNS topic
        this.cfSystemsUpdatesTopic = new sns.Topic(this, 'CFSystemsUpdatesTopic', {
            topicName: 'CFSystemsUpdatesTopic'
        });

        // Create SQS queue to receive messages from the topic
        const cfSystemsUpdatesQueue = new sqs.Queue(this, 'CFSystemsUpdatesQueue', {
            queueName: 'CFSystemsUpdatesQueue',
            visibilityTimeout: Duration.seconds(30),
            retentionPeriod: Duration.days(4),
        });

        // Subscribe the queue to the SNS topic
        this.cfSystemsUpdatesTopic.addSubscription(
            new subs.SqsSubscription(cfSystemsUpdatesQueue)
        );

        // Export the topic ARN for use in SAM or other stacks
        new CfnOutput(this, 'CFSystemsTopicArn', {
            value: this.cfSystemsUpdatesTopic.topicArn,
            exportName: 'CFSystemsUpdatesTopicArn'
        });
    }
}
