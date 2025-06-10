import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';

export class BlueEyedSoulSchedulerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const lambdaArn = 'arn:aws:lambda:us-west-2:276366037431:function:BlueEyedSoul-Prod';

        // IAM role for EventBridge Scheduler
        const schedulerRole = new iam.Role(this, 'SchedulerRole', {
            assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
        });

        schedulerRole.addToPolicy(new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [lambdaArn],
        }));

        // EventBridge Scheduler
        new scheduler.CfnSchedule(this, 'TokenCheckSchedule-Prod', {
            name: 'TokenCheckSchedule-Prod',
            scheduleExpressionTimezone: 'America/Los_Angeles',
            scheduleExpression: 'rate(20 minutes)',
            flexibleTimeWindow: {
                mode: 'OFF',
            },
            target: {
                arn: lambdaArn,
                roleArn: schedulerRole.roleArn,
                input: JSON.stringify({ operation: 'TokenCheck' }),
            },
            description: 'Triggers BlueEyedSoul-Prod every 20 minutes',
            state: 'ENABLED',
        });

        // EventBridge Scheduler
        new scheduler.CfnSchedule(this, 'DailyCheckSchedule-Prod', {
            name: 'DailyCheckSchedule-Prod',
            description: 'Runs daily at 4:20 PM Pacific Time',
            scheduleExpression: 'cron(20 16 * * ? *)',
            scheduleExpressionTimezone: 'America/Los_Angeles',
            flexibleTimeWindow: {
                mode: 'OFF',
            },
            target: {
                arn: lambdaArn,
                roleArn: schedulerRole.roleArn,
                input: JSON.stringify({ operation: 'DailyScreen' }),
            },
            state: 'ENABLED',
        });
    }
}
