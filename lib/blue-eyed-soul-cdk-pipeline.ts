import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as cp_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';

export class BlueEyedSoulPipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const artifactBucket = new s3.Bucket(this, 'ArtifactBucket');

        const sourceOutput = new codepipeline.Artifact('SourceOutput');
        const buildOutput = new codepipeline.Artifact('BuildOutput');
        const betaUploadOutput = new codepipeline.Artifact('BetaUploadOutput');
        const prodUploadOutput = new codepipeline.Artifact('ProdUploadOutput');
        const s3Key = 'blue-eyed-soul.zip';

        const sourceAction = new cp_actions.CodeStarConnectionsSourceAction({
            actionName: 'Source',
            owner: 'MohammadHamdy95',
            repo: 'blueeyedsoul-be',
            branch: 'main',
            output: sourceOutput,
            connectionArn: 'arn:aws:codeconnections:us-west-2:276366037431:connection/fff370e6-5cf3-4e4b-8087-4c3332b8eff6',
        });

        const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
            environment: {
                buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
                computeType: codebuild.ComputeType.SMALL,
            },
            buildSpec: codebuild.BuildSpec.fromAsset('assets/yml/codebuild/buildspec.yml'),
        });

        buildProject.role?.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
        );

        const buildAction = new cp_actions.CodeBuildAction({
            actionName: 'Build',
            project: buildProject,
            input: sourceOutput,
            outputs: [buildOutput],
        });

        const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
            pipelineName: 'BlueEyedSoulLambdaPipeline',
            artifactBucket,
            stages: [
                { stageName: 'Source', actions: [sourceAction] },
                { stageName: 'Build', actions: [buildAction] },
            ],
        });

        pipeline.role?.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
        );

        addDeployStage(this, pipeline, 'DeployBeta', false, s3Key, sourceOutput, betaUploadOutput);
        addDeployStage(this, pipeline, 'DeployProd', true, s3Key, sourceOutput, prodUploadOutput);
    }
}

function addDeployStage(
    scope: Construct,
    pipeline: codepipeline.Pipeline,
    stageName: string,
    isProd: boolean,
    s3Key: string,
    inputArtifact: codepipeline.Artifact,
    uploadOutput: codepipeline.Artifact
) {
    const idSuffix = isProd ? 'Prod' : 'Beta';
    const bucketName = `blue-eyed-soul-lambda-code-${isProd ? 'prod' : 'beta'}`;
    let runOrder = 1;
    const nextOrder = () => runOrder++;

    const actions: cp_actions.Action[] = [];

    if (isProd) {
        const waitStateMachine = new sfn.StateMachine(scope, `WaitStateMachine${idSuffix}`, {
            stateMachineName: `Wait10Minutes-${idSuffix}`,
            definition: new sfn.Wait(scope, `Wait10Minutes`, {
                time: sfn.WaitTime.duration(cdk.Duration.minutes(10)),
            }),
        });

        actions.push(new cp_actions.StepFunctionInvokeAction({
            actionName: 'Wait10Minutes',
            stateMachine: waitStateMachine,
            stateMachineInput: cp_actions.StateMachineInput.literal({}),
            runOrder: nextOrder(),
        }));
    }

    const uploaderProject = new codebuild.PipelineProject(scope, `Uploader${idSuffix}`, {
        environment: {
            buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_5,
            computeType: codebuild.ComputeType.SMALL,
            environmentVariables: {
                S3_BUCKET: { value: bucketName },
                S3_KEY: { value: s3Key },
                STAGE: { value: isProd ? 'prod' : 'beta' },
            },
        },
        buildSpec: codebuild.BuildSpec.fromAsset('assets/yml/beta/buildspec.yml'),
    });

    uploaderProject.addToRolePolicy(new iam.PolicyStatement({
        actions: ['s3:*'],
        resources: [
            `arn:aws:s3:::${bucketName}`,
            `arn:aws:s3:::${bucketName}/*`,
        ],
    }));

    actions.push(new cp_actions.CodeBuildAction({
        actionName: `UploadLambda${idSuffix}`,
        project: uploaderProject,
        input: inputArtifact,
        outputs: [uploadOutput],
        runOrder: nextOrder(),
    }));

    actions.push(new cp_actions.CloudFormationCreateUpdateStackAction({
        actionName: `Deploy${idSuffix}`,
        stackName: `BlueEyedSoulLambda${idSuffix}`,
        templatePath: uploadOutput.atPath('lambda.yml'),
        adminPermissions: true,
        parameterOverrides: {
            LambdaFunctionName: `BlueEyedSoul-${idSuffix}`,
            LambdaCodeBucket: bucketName,
            LambdaCodeKey: s3Key,
            DeployTimestamp: new Date().toISOString(),
        },
        extraInputs: [uploadOutput],
        runOrder: nextOrder(),
    }));

    pipeline.addStage({ stageName, actions });
}
