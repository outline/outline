import * as iam from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface GithubActionsRoleProps {
  repo: string;
  branch: string;
  stackName: string;
  region: string;
  accountId: string;
}

/** IAM role for GitHub Actions OIDC authentication to deploy Outline. */
export class GithubActionsRole extends Construct {
  constructor(scope: Construct, id: string, props: GithubActionsRoleProps) {
    super(scope, id);

    const oidcProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      "GithubOidc",
      `arn:aws:iam::${props.accountId}:oidc-provider/token.actions.githubusercontent.com`,
    );

    const role = new iam.Role(this, "Role", {
      roleName: "outline-github-actions",
      assumedBy: new iam.WebIdentityPrincipal(
        oidcProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:sub": `repo:${props.repo}:ref:refs/heads/${props.branch}`,
          },
        },
      ),
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [`arn:aws:iam::${props.accountId}:role/cdk-*`],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "cloudformation:CreateChangeSet",
          "cloudformation:CreateStack",
          "cloudformation:DeleteChangeSet",
          "cloudformation:DescribeChangeSet",
          "cloudformation:DescribeStackEvents",
          "cloudformation:DescribeStacks",
          "cloudformation:ExecuteChangeSet",
          "cloudformation:GetTemplate",
          "cloudformation:GetTemplateSummary",
          "cloudformation:UpdateStack",
        ],
        resources: [
          `arn:aws:cloudformation:${props.region}:${props.accountId}:stack/${props.stackName}/*`,
        ],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:GetEncryptionConfiguration",
        ],
        resources: [
          `arn:aws:s3:::cdk-*-assets-${props.accountId}-${props.region}`,
          `arn:aws:s3:::cdk-*-assets-${props.accountId}-${props.region}/*`,
        ],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:SendCommand"],
        resources: [
          `arn:aws:ssm:${props.region}::document/AWS-RunShellScript`,
        ],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:SendCommand"],
        resources: [
          `arn:aws:ec2:${props.region}:${props.accountId}:instance/*`,
        ],
        conditions: {
          StringEquals: {
            "aws:ResourceTag/Project": "outline",
          },
        },
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetCommandInvocation"],
        resources: ["*"],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:PutParameter"],
        resources: [
          `arn:aws:ssm:${props.region}:${props.accountId}:parameter/outline/deploy-config`,
        ],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ec2:DescribeInstances"],
        resources: ["*"],
      }),
    );
  }
}
