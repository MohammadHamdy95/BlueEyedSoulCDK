import {
    aws_lambda as lambda,
    aws_lambda_event_sources as sources,
    aws_sns as sns,
    StackProps, Stack, aws_dynamodb
} from 'aws-cdk-lib';
import {Construct} from "constructs";

export class CfSystemsUpdateNotifierStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const table = aws_dynamodb.Table.fromTableName(this, 'CFSystemsTableRef', 'CFSystemsTable');

        const topic = new sns.Topic(this, 'CFSystemsUpdatesTopic', {
            topicName: 'CFSystemsUpdatesTopic'
        });

        const fn = new lambda.Function(this, 'CFSystemsStreamHandler', {
            runtime: lambda.Runtime.NODEJS_18_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('lambda/cfsystems-sns-publisher'),
            environment: {
                TOPIC_ARN: topic.topicArn
            }
        });

        fn.addEventSource(new sources.DynamoEventSource(table, {
            startingPosition: lambda.StartingPosition.LATEST,
            retryAttempts: 2,
            batchSize: 5
        }));

        topic.grantPublish(fn);
    }
}
