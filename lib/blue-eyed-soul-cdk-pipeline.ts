import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as cp_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';

export class BlueEyedSoulPipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const artifactBucket = new s3.Bucket(this, 'ArtifactBucket');
        const sourceOutput = new codepipeline.Artifact('SourceOutput');
        const buildOutput = new codepipeline.Artifact('BuildOutput');
        const betaUploadOutput = new codepipeline.Artifact('BetaUploadOutput');
        const prodUploadOutput = new codepipeline.Artifact('ProdUploadOutput');
        const s3Key = `blue-eyed-soul.zip`;

        const sourceAction = new cp_actions.CodeStarConnectionsSourceAction({
            actionName: 'BlueEyedSoulRepo',
            owner: 'MohammadHamdy95',
            repo: 'blueeyedsoul-be',
            branch: 'main',
            output: sourceOutput,
            connectionArn: 'arn:aws:codeconnections:us-west-2:276366037431:connection/fff370e6-5cf3-4e4b-8087-4c3332b8eff6',
        });

        const buildProject = new codebuild.PipelineProject(this, 'GradleBuildProject', {
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
            },
            buildSpec: codebuild.BuildSpec.fromAsset('assets/yml/codebuild/buildspec.yml'),
        });

        buildProject.role?.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
        );

        const gradleBuildAction = new cp_actions.CodeBuildAction({
            actionName: 'GradleBuildAction',
            project: buildProject,
            input: sourceOutput,
            outputs: [buildOutput],
            runOrder: 1,
        });

        const pipeline = new codepipeline.Pipeline(this, 'BlueEyedSoulLambdaPipeline', {
            pipelineName: 'BlueEyedSoulLambdaPipeline',
            artifactBucket,
            stages: [
                {
                    stageName: 'Source',
                    actions: [sourceAction],
                },
                {
                    stageName: 'Build',
                    actions: [gradleBuildAction],
                },
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
    const bucketName = isProd ? 'blue-eyed-soul-lambda-code-prod' : 'blue-eyed-soul-lambda-code-beta';
    let runOrder = 1;

    function incrementRunOrder(): number {
        runOrder++
        return runOrder;
    }

    const actions: cp_actions.Action[] = [];
    if (isProd) {
        const waitStateMachine = new sfn.StateMachine(scope, `WaitStateMachine${idSuffix}`, {
            stateMachineName: `Wait1HourStateMachine${idSuffix}`,
            definition: new sfn.Wait(scope, `Wait1Hour${idSuffix}`, {
                time: sfn.WaitTime.duration(cdk.Duration.hours(1)),
            }),
        });

        const waitAction = new cp_actions.StepFunctionInvokeAction({
            actionName: `Wait1Hour${idSuffix}`,
            stateMachine: waitStateMachine,
            stateMachineInput: cp_actions.StateMachineInput.literal({}),
            runOrder: incrementRunOrder(),
        });

        actions.push(waitAction);
    }

    const uploaderProject = new codebuild.PipelineProject(scope, `Uploader${idSuffix}`, {
        environment: {
            buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
            environmentVariables: {
                S3_BUCKET: { value: bucketName },
                S3_KEY: { value: s3Key },
                STAGE: { value: isProd ? `prod` : 'beta' },
            },
        },
        buildSpec: codebuild.BuildSpec.fromAsset(`assets/yml/beta/buildspec.yml`),
    });

    const uploadAction = new cp_actions.CodeBuildAction({
        actionName: `UploadLambdaZip${idSuffix}`,
        project: uploaderProject,
        input: inputArtifact,
        runOrder: incrementRunOrder(),
        outputs: uploadOutput ? [uploadOutput] : [],
    });

    uploaderProject.addToRolePolicy(new iam.PolicyStatement({
        actions: [
            "s3:PutObject",
            "s3:GetObject",
            "s3:DeleteObject",
            "s3:ListBucket",
        ],
        resources: [
            "arn:aws:s3:::blue-eyed-soul-lambda-code*",
            "arn:aws:s3:::blue-eyed-soul-lambda-code*/*",
        ],
    }));

    actions.push(uploadAction);

    const deployAction = new cp_actions.CloudFormationCreateUpdateStackAction({
        actionName: `Deploy${idSuffix}`,
        stackName: `BlueEyedSoulLambda${idSuffix}Stack`,
        templatePath: uploadOutput.atPath('lambda.yml'),
        adminPermissions: true,
        parameterOverrides: {
            LambdaFunctionName: `BlueEyedSoul-${idSuffix}`,
            LambdaCodeBucket: bucketName,
            LambdaCodeKey: s3Key,
            DeployTimestamp: `Deployed at ` + Date.now().toString(),
        },
        extraInputs: [uploadOutput],
        runOrder: incrementRunOrder(),
    });

    actions.push(deployAction);

    pipeline.addStage({
        stageName,
        actions,
    });
}
