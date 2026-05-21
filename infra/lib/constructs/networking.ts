import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class OutlineNetworking extends Construct {
  readonly vpc: ec2.IVpc;
  readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = ec2.Vpc.fromLookup(this, "Vpc", { isDefault: true });

    this.securityGroup = new ec2.SecurityGroup(this, "SG", {
      vpc: this.vpc,
      description: "Outline wiki",
      allowAllOutbound: true,
    });

    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
    );
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
    );
  }
}
