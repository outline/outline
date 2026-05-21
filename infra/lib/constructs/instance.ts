import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import { join } from "path";

interface InstanceProps {
  vpc: ec2.IVpc;
  securityGroup: ec2.SecurityGroup;
  bucket: s3.Bucket;
  prefix: string;
  region: string;
  ssmPrefix: string;
  domain: string;
  bucketName: string;
  outlineVersion: string;
  instanceType: string;
  dataDiskSizeGb: number;
}

export class OutlineInstance extends Construct {
  readonly instance: ec2.Instance;
  readonly eip: ec2.CfnEIP;

  constructor(scope: Construct, id: string, props: InstanceProps) {
    super(scope, id);

    const role = new iam.Role(this, "Role", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
      ],
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetParameter", "ssm:GetParameters"],
        resources: [
          `arn:aws:ssm:${props.region}:*:parameter${props.ssmPrefix}/*`,
        ],
      }),
    );

    props.bucket.grantReadWrite(role);

    const userData = ec2.UserData.forLinux();
    const script = readFileSync(
      join(__dirname, "../user-data.sh"),
      "utf-8",
    )
      .replace(/\{\{REGION\}\}/g, props.region)
      .replace(/\{\{SSM_PREFIX\}\}/g, props.ssmPrefix)
      .replace(/\{\{DOMAIN\}\}/g, props.domain)
      .replace(/\{\{BUCKET_NAME\}\}/g, props.bucketName)
      .replace(/\{\{OUTLINE_VERSION\}\}/g, props.outlineVersion);
    userData.addCommands(script);

    this.instance = new ec2.Instance(this, "Instance", {
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: new ec2.InstanceType(props.instanceType),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup: props.securityGroup,
      role,
      userData,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(20, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
    });

    const dataVolume = new ec2.Volume(this, "DataVolume", {
      availabilityZone: this.instance.instanceAvailabilityZone,
      size: cdk.Size.gibibytes(props.dataDiskSizeGb),
      volumeType: ec2.EbsDeviceVolumeType.GP3,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    new ec2.CfnVolumeAttachment(this, "DataVolumeAttach", {
      device: "/dev/xvdf",
      instanceId: this.instance.instanceId,
      volumeId: dataVolume.volumeId,
    });

    this.eip = new ec2.CfnEIP(this, "EIP");
    new ec2.CfnEIPAssociation(this, "EIPAssoc", {
      allocationId: this.eip.attrAllocationId,
      instanceId: this.instance.instanceId,
    });
  }
}
