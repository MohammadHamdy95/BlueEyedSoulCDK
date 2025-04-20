import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as cp_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export class BlueEyedSoulPipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const artifactBucket = new s3.Bucket(this, 'ArtifactBucket');

        const sourceOutput = new codepipeline.Artifact('SourceOutput');
        const buildOutput = new codepipeline.Artifact('BuildOutput');
        const betaPreBuildOutput = new codepipeline.Artifact('BetaPreBuildOutput');
        const betaUploadOutput = new codepipeline.Artifact('BetaUploadOutput');
        const prodUploadOutput = new codepipeline.Artifact('ProdUploadOutput');

        const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
        const s3Key = `lambda-${timestamp}.zip`;

        const sourceAction = new cp_actions.CodeStarConnectionsSourceAction({
            actionName: 'GitHub_Source',
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

        addDeployStage(this, pipeline, 'DeployBeta', false, s3Key, buildOutput, sourceOutput, betaPreBuildOutput, betaUploadOutput);
        addDeployStage(this, pipeline, 'ApproveAndDeployProd', true, s3Key, buildOutput, sourceOutput, undefined, prodUploadOutput);
    }
}

function addDeployStage(
    scope: Construct,
    pipeline: codepipeline.Pipeline,
    stageName: string,
    isProd: boolean,
    s3Key: string,
    inputArtifact: codepipeline.Artifact,
    sourceArtifact: codepipeline.Artifact,
    preBuildOutput?: codepipeline.Artifact,
    uploadOutput?: codepipeline.Artifact
) {
    const idSuffix = isProd ? 'Prod' : 'Beta';
    const bucketName = isProd ? 'blue-eyed-soul-lambda-code-prod' : 'blue-eyed-soul-lambda-code-beta';
    const buildSpecPath = isProd ? 'assets/yml/prod/buildspec.yml' : 'assets/yml/beta/buildspec.yml';

    const actions: cp_actions.Action[] = [];

    if (!isProd) {
        const betaPreBuildProject = new codebuild.PipelineProject(scope, `BetaPreUploadBuild`, {
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
            },
            buildSpec: codebuild.BuildSpec.fromAsset('assets/yml/beta/buildspec.yml'),
        });

        const betaPreBuildAction = new cp_actions.CodeBuildAction({
            actionName: 'BetaPreBuildCheck',
            project: betaPreBuildProject,
            runOrder: 1,
            input: inputArtifact
        });

        actions.push(betaPreBuildAction);
    }

    if (isProd) {
        actions.push(new cp_actions.ManualApprovalAction({
            actionName: 'ApproveBeforeProd',
            runOrder: 1,
        }));
    }

    const uploaderProject = new codebuild.PipelineProject(scope, `Uploader${idSuffix}`, {
        environment: {
            buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
            environmentVariables: {
                S3_BUCKET: { value: bucketName },
                S3_KEY: { value: s3Key },
            },
        },
        buildSpec: codebuild.BuildSpec.fromAsset(buildSpecPath),
    });

    const uploadAction = new cp_actions.CodeBuildAction({
        actionName: `UploadLambdaZip${idSuffix}`,
        project: uploaderProject,
        input: inputArtifact,
        runOrder: 2,
        outputs: uploadOutput ? [uploadOutput] : [],
    });

    actions.push(uploadAction);

    const deployAction = new cp_actions.CloudFormationCreateUpdateStackAction({
        actionName: `Deploy${idSuffix}`,
        stackName: `BlueEyedSoulLambda${idSuffix}Stack`,
        templatePath: sourceArtifact.atPath('lambda.yml'),
        adminPermissions: true,
        parameterOverrides: {
            LambdaFunctionName: `BlueEyedSoul-${idSuffix}`,
            LambdaCodeBucket: bucketName,
            LambdaCodeKey: s3Key,
        },
        extraInputs: [inputArtifact],
        runOrder: 3,
    });

    actions.push(deployAction);

    pipeline.addStage({
        stageName,
        actions,
    });
}
