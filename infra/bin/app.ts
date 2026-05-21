#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { config } from "../lib/config";
import { OutlineStack } from "../lib/outline-stack";

const app = new cdk.App();

const stack = new OutlineStack(app, config.prefix, {
  config,
  env: { account: config.accountId, region: config.region },
  description: "Self-hosted Outline wiki (docs.attuned.ai)",
});

cdk.Tags.of(stack).add("Project", "outline");
cdk.Tags.of(stack).add("Environment", "production");
cdk.Tags.of(stack).add("ManagedBy", "CDK");
