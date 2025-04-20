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

    // Source stage: GitHub via CodeStar Connection
    const sourceAction = new cp_actions.CodeStarConnectionsSourceAction({
      actionName: 'GitHub_Source',
      owner: 'MohammadHamdy95',
      repo: 'blueeyedsoul-be',
      branch: 'main',
      output: sourceOutput,
      connectionArn: 'arn:aws:codeconnections:us-west-2:276366037431:connection/fff370e6-5cf3-4e4b-8087-4c3332b8eff6',
    });

    // Build stage: CodeBuild project using buildspec.yml
    const buildProject = new codebuild.PipelineProject(this, 'GradleBuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        environmentVariables: {
          S3_BUCKET: { value: 'blue-eyed-soul-lambda-code' },
        },
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
    });

    // Give admin access to CodeBuild role
    buildProject.role?.addManagedPolicy(
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
    );

    const lambdaCodeBucket = s3.Bucket.fromBucketName(this, 'TargetLambdaCodeBucket', 'blue-eyed-soul-lambda-code');
    lambdaCodeBucket.grantPut(buildProject.role!);


    const buildAction = new cp_actions.CodeBuildAction({
      actionName: 'CI_Gradle_Build',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
      runOrder: 2,
    });

    const betaDeployAction = new cp_actions.CloudFormationCreateUpdateStackAction({
        actionName: 'DeployBeta',
        stackName: 'BlueEyedSoulLambdaBetaStack',
        templatePath: buildOutput.atPath('lambda.yml'),
        adminPermissions: true,
        parameterOverrides: {
            LambdaFunctionName: 'BlueEyedSoul-Beta',
        },
    });

    const prodApprovalAction = new cp_actions.ManualApprovalAction({
        actionName: 'ApproveBeforeProd',
        runOrder: 1,
    });

    const prodDeployAction = new cp_actions.CloudFormationCreateUpdateStackAction({
        actionName: 'DeployProd',
        stackName: 'BlueEyedSoulLambdaProdStack',
        templatePath: buildOutput.atPath('lambda.yml'),
        adminPermissions: true,
        parameterOverrides: {
            LambdaFunctionName: 'BlueEyedSoul-Prod',
        },
        runOrder:2 // ensure that it runs second
    });


    // Create pipeline
    new codepipeline.Pipeline(this, 'BlueEyedSoulLambdaPipeline', {
      pipelineName: 'BlueEyedSoulLambdaPipeline',
      artifactBucket,
      stages: [
        {
          stageName: 'Source',
          actions: [sourceAction],
        },
        {
          stageName: 'GradleBuild',
          actions: [
            buildAction,
          ],
        },
        {
          stageName: 'DeployBeta',
          actions: [betaDeployAction],
        },
          {
              stageName: 'ApproveAndDeployProd',
              actions: [prodApprovalAction, prodDeployAction],
          },
      ],
    });
  }
}

