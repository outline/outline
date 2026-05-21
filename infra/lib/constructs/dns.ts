import * as route53 from "aws-cdk-lib/aws-route53";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

interface DnsProps {
  domain: string;
  hostedZoneDomain: string;
  eip: ec2.CfnEIP;
}

export class OutlineDns extends Construct {
  constructor(scope: Construct, id: string, props: DnsProps) {
    super(scope, id);

    const zone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: props.hostedZoneDomain,
    });

    new route53.ARecord(this, "ARecord", {
      zone,
      recordName: props.domain,
      target: route53.RecordTarget.fromIpAddresses(
        props.eip.attrPublicIp,
      ),
    });
  }
}
