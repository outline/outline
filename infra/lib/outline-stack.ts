import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { OutlineNetworking } from "./constructs/networking";
import { OutlineStorage } from "./constructs/storage";
import { OutlineInstance } from "./constructs/instance";
import { OutlineDns } from "./constructs/dns";
import type { config as Config } from "./config";

interface OutlineStackProps extends cdk.StackProps {
  config: typeof Config;
}

export class OutlineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OutlineStackProps) {
    super(scope, id, props);

    const { config } = props;

    const network = new OutlineNetworking(this, "Network");

    const storage = new OutlineStorage(this, "Storage", {
      bucketName: config.bucketName,
      domain: config.domain,
    });

    const instance = new OutlineInstance(this, "Instance", {
      vpc: network.vpc,
      securityGroup: network.securityGroup,
      bucket: storage.bucket,
      prefix: config.prefix,
      region: config.region,
      ssmPrefix: config.ssmPrefix,
      domain: config.domain,
      bucketName: config.bucketName,
      outlineVersion: config.outlineVersion,
      instanceType: config.instanceType,
      dataDiskSizeGb: config.dataDiskSizeGb,
    });

    new OutlineDns(this, "Dns", {
      domain: config.domain,
      hostedZoneDomain: config.hostedZoneDomain,
      eip: instance.eip,
    });

    new cdk.CfnOutput(this, "PublicIp", {
      value: instance.eip.attrPublicIp,
      description: "Outline EC2 public IP",
    });

    new cdk.CfnOutput(this, "Url", {
      value: `https://${config.domain}`,
      description: "Outline URL",
    });
  }
}
