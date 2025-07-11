import { Stack, StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class BlueEyedSoulDdbStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        new dynamodb.Table(this, 'CFSystemsTable', {
            tableName: 'CFSystemsTable',
            partitionKey: { name: 'Username', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.RETAIN,
            // stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
        });

        new dynamodb.Table(this, 'InvoiceTable', {
            tableName: 'InvoiceTable',
            partitionKey: { name: 'InvoiceId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.RETAIN
        });

        new dynamodb.Table(this, 'MateAccountTable', {
            tableName: 'MateAccountTable',
            partitionKey: { name: 'Email', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.RETAIN
        });

        new dynamodb.Table(this, 'TokenTable', {
            tableName: 'TokenTable',
            partitionKey: { name: 'AccountOwner', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.RETAIN
        });

        new dynamodb.Table(this, 'UserProfiles', {
            tableName: 'UserProfiles',
            partitionKey: { name: 'Username', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.RETAIN
        });

        new dynamodb.Table(this, 'VODAccountsTable', {
            tableName: 'VODAccountsTable',
            partitionKey: { name: 'Username', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.RETAIN
        });

        new dynamodb.Table(this, 'MbServerTable', {
            tableName: 'MbServerTable',
            partitionKey: { name: 'Username', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.RETAIN
        });

        new dynamodb.Table(this, 'EmailPaginatorTable', {
            tableName: 'EmailPaginatorTable',
            partitionKey: { name: 'Account', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: RemovalPolicy.RETAIN
        });
    }
}
