import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';

export class ProcessingLambdaSchedulerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const lambdaArn = 'arn:aws:lambda:us-west-2:276366037431:function:proccessing-lambda-stack-ProcessingLambda-6pvXhhTImkDv';

        // IAM role for EventBridge Scheduler
        const schedulerRole = new iam.Role(this, 'ProcessingSchedulerRole', {
            assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
        });

        schedulerRole.addToPolicy(new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [lambdaArn],
        }));

        // Example: Every 5 minutes task
        new scheduler.CfnSchedule(this, 'PaymentCheckSchedule', {
            name: 'PaymentCheckSchedule',
            scheduleExpressionTimezone: 'America/Los_Angeles',
            scheduleExpression: 'rate(1 minute)',
            flexibleTimeWindow: {
                mode: 'OFF',
            },
            target: {
                arn: lambdaArn,
                roleArn: schedulerRole.roleArn,
                input: JSON.stringify({ operation: 'RefreshQueue' }), // customize as needed
            },
            description: 'Invokes Processing Lambda every 1 minute',
            state: 'ENABLED',
        });
    }
}
