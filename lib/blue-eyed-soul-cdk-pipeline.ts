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


    const betaUploaderProject = new codebuild.PipelineProject(this, 'BetaUploaderProject', {
        environment: {
            buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
            environmentVariables: {
                S3_BUCKET: { value: 'blue-eyed-soul-lambda-code-beta' },
            },
        },
        buildSpec: codebuild.BuildSpec.fromObject({
            version: '0.2',
            phases: {
                build: {
                    commands: [
                        'echo "Uploading lambda-deploy.zip to Beta bucket..."',
                        'TIMESTAMP=$(date +%Y%m%d%H%M%S)',
                        'S3_KEY=lambda-$TIMESTAMP.zip',
                        'aws s3 cp lambda-deploy.zip s3://$S3_BUCKET/$S3_KEY',
                        'echo "AWSTemplateFormatVersion: \'2010-09-09\'" > lambda.yml',
                        'echo "Parameters:" >> lambda.yml',
                        'echo "  LambdaFunctionName:" >> lambda.yml',
                        'echo "    Type: String" >> lambda.yml',
                        'echo "  LambdaFunctionCodeBucketName:" >> lambda.yml',
                        'echo "    Type: String" >> lambda.yml',
                        'echo "Resources:" >> lambda.yml',
                        'echo "  MyLambdaFunction:" >> lambda.yml',
                        'echo "    Type: AWS::Lambda::Function" >> lambda.yml',
                        'echo "    Properties:" >> lambda.yml',
                        'echo "      FunctionName: !Ref LambdaFunctionName" >> lambda.yml',
                        'echo "      Handler: com.mo.blueeyedsoul.Handler::handleRequest" >> lambda.yml',
                        'echo "      Runtime: java21" >> lambda.yml',
                        'echo "      Role: arn:aws:iam::276366037431:role/service-role/profiles-update-beta-role-6br7r4r0" >> lambda.yml',
                        'echo "      Timeout: 60" >> lambda.yml',
                        'echo "      MemorySize: 512" >> lambda.yml',
                        'echo "      Code:" >> lambda.yml',
                        'echo "        S3Bucket: $S3_BUCKET" >> lambda.yml',
                        'echo "        S3Key: $S3_KEY" >> lambda.yml',
                    ],
                },
            },
            artifacts: {
                files: ['lambda.yml'],
            },
        }),
    });

    const lambdaCodeBucket = s3.Bucket.fromBucketName(this, 'TargetLambdaCodeBucket', 'blue-eyed-soul-lambda-code');
    lambdaCodeBucket.grantPut(buildProject.role!);


    const buildAction = new cp_actions.CodeBuildAction({
      actionName: 'CI_Gradle_Build',
      project: buildProject,
      input: sourceOutput,
      outputs: [buildOutput],
      runOrder: 2,
    });

    const uploadAction = new cp_actions.CodeBuildAction({
        actionName: 'UploadLambdaZip',
        project: betaUploaderProject,
        input: buildOutput,
        outputs: [new codepipeline.Artifact('BetaTemplate')],
        runOrder: 1,
    });

    const uploadActionProd = new cp_actions.CodeBuildAction({
        actionName: 'UploadLambdaZip',
        project: betaUploaderProject,
        input: buildOutput,
        outputs: [new codepipeline.Artifact('ProdTemplate')],
        runOrder: 1,
    });

    const betaDeployAction = new cp_actions.CloudFormationCreateUpdateStackAction({
        actionName: 'DeployBeta',
        stackName: 'BlueEyedSoulLambdaBetaStack',
        templatePath: buildOutput.atPath('lambda.yml'),
        adminPermissions: true,
        parameterOverrides: {
            LambdaFunctionName: 'BlueEyedSoul-Beta',
            LambdaFunctionCodeBucketName: 'blue-eyed-soul-lambda-code-beta',
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
            LambdaFunctionCodeBucketName: 'blue-eyed-soul-lambda-code-prod',
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
          actions: [uploadAction, betaDeployAction],
        },
          {
              stageName: 'ApproveAndDeployProd',
              actions: [prodApprovalAction, uploadActionProd,prodDeployAction],
          },
      ],
    });
  }
}

