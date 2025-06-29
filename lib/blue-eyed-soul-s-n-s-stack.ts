import { Stack, StackProps, CfnOutput, Duration } from 'aws-cdk-lib';
import {
    aws_sns as sns,
    aws_sqs as sqs,
    aws_sns_subscriptions as subs
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class BlueEyedSoulSNSStack extends Stack {
    public readonly cfSystemsUpdatesTopic: sns.Topic;
    public readonly processingLambdaUpdatesTopic: sns.Topic;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // === First SNS & SQS Setup ===
        this.cfSystemsUpdatesTopic = new sns.Topic(this, 'CFSystemsUpdatesTopic', {
            topicName: 'CFSystemsUpdatesTopic'
        });

        const cfSystemsUpdatesQueue = new sqs.Queue(this, 'CFSystemsUpdatesQueue', {
            queueName: 'CFSystemsUpdatesQueue',
            visibilityTimeout: Duration.seconds(30),
            retentionPeriod: Duration.days(4),
        });

        this.cfSystemsUpdatesTopic.addSubscription(
            new subs.SqsSubscription(cfSystemsUpdatesQueue)
        );

        new CfnOutput(this, 'CFSystemsTopicArn', {
            value: this.cfSystemsUpdatesTopic.topicArn,
            exportName: 'CFSystemsUpdatesTopicArn'
        });

        new CfnOutput(this, 'CFSystemsUpdatesQueueArn', {
            value: cfSystemsUpdatesQueue.queueArn,
            exportName: 'CFSystemsUpdatesQueueArn'
        });

        new CfnOutput(this, 'CFSystemsUpdatesQueueUrl', {
            value: cfSystemsUpdatesQueue.queueUrl,
            exportName: 'CFSystemsUpdatesQueueUrl'
        });

        // === New SNS & SQS Setup ===
        this.processingLambdaUpdatesTopic = new sns.Topic(this, 'ProcessingLambdaUpdatesTopic', {
            topicName: 'ProcessingLambdaUpdates'
        });

        const blueEyedSoulInboundUserChangesQueue = new sqs.Queue(this, 'BlueEyedSoulInboundUserChangesQueue', {
            queueName: 'BlueEyedSoulInboundUserChanges',
            visibilityTimeout: Duration.seconds(65),
            retentionPeriod: Duration.days(4),
        });

        this.processingLambdaUpdatesTopic.addSubscription(
            new subs.SqsSubscription(blueEyedSoulInboundUserChangesQueue)
        );

        new CfnOutput(this, 'ProcessingLambdaUpdatesTopicArn', {
            value: this.processingLambdaUpdatesTopic.topicArn,
            exportName: 'ProcessingLambdaUpdatesTopicArn'
        });

        new CfnOutput(this, 'BlueEyedSoulInboundUserChangesQueueArn', {
            value: blueEyedSoulInboundUserChangesQueue.queueArn,
            exportName: 'BlueEyedSoulInboundUserChangesQueueArn'
        });

        new CfnOutput(this, 'BlueEyedSoulInboundUserChangesQueueUrl', {
            value: blueEyedSoulInboundUserChangesQueue.queueUrl,
            exportName: 'BlueEyedSoulInboundUserChangesQueueUrl'
        });
    }
}
