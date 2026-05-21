# Outline Self-Hosted Deployment Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Notion with self-hosted Outline on AWS, authenticated via Google Workspace (@attuned.ai), with Notion data migration.

**Architecture:** Single EC2 instance running docker-compose (Outline + Postgres + Redis), S3 for file uploads, Caddy for TLS. CDK provisions all AWS resources. UserData bootstraps docker and fetches secrets from SSM at first boot.

**Tech Stack:** AWS CDK (TypeScript), Docker Compose, PostgreSQL 16, Redis 7, Caddy, EC2/S3/Route53/SSM

**License:** BSL 1.1 - internal self-hosting allowed. Cannot resell as competing Document Service. Apache 2.0 after 2030-05-04.

**Cost Estimate:**
| Resource | Monthly Cost |
|----------|-------------|
| EC2 t3.small (2 vCPU, 2GB RAM) | ~$15 |
| EBS 30GB gp3 (data volume) | ~$2.40 |
| S3 file storage | ~$1 |
| Route53 | $0.50 |
| Data transfer | ~$2 |
| **Total** | **~$21/month** |

Compare: Notion at $10/seat/month.

**CDK Structure** (in `infra/`, separate from upstream Outline code):
```
infra/
  bin/app.ts
  lib/config.ts
  lib/outline-stack.ts
  lib/constructs/networking.ts
  lib/constructs/storage.ts
  lib/constructs/instance.ts
  lib/constructs/dns.ts
  lib/user-data.sh
  cdk.json
  package.json
  tsconfig.json
```

## Decisions

- **Domain:** `docs.attuned.ai`
- **DNS:** Route53 (attuned.ai zone)
- **Region:** `eu-central-1` (Frankfurt)
- **Account:** `662860781475`
- **Auth:** Google OAuth, `@attuned.ai` only
- **Secrets:** SSM Parameter Store (`/outline/*`)
- **Access:** SSM Session Manager only, no SSH key, no port 22
- **Data persistence:** Separate EBS volume (RETAIN policy). Backups are the disaster recovery story - daily pg_dump to S3.
- **S3 auth:** Instance role (no static IAM creds). If Outline doesn't pick up instance profile credentials, fall back to IAM user creds stored in SSM.
- **Fork:** https://github.com/wahlandcase/attuned.outline (done)

---

## Task 1: Fork Outline to wahlandcase org

DONE - forked to https://github.com/wahlandcase/attuned.outline, cloned to `~/Programming/attuned/attuned.outline`.

---

## Task 2: Scaffold CDK project

**Files:**
- Create: `infra/package.json`
- Create: `infra/tsconfig.json`
- Create: `infra/cdk.json`

**Step 1: Create package.json**

```json
{
  "name": "attuned-outline-infra",
  "version": "0.1.0",
  "scripts": {
    "build": "tsc",
    "cdk": "cdk",
    "synth": "cdk synth",
    "deploy": "cdk deploy --require-approval never",
    "destroy": "cdk destroy"
  },
  "devDependencies": {
    "aws-cdk": "2.170.0",
    "ts-node": "^10.9.0",
    "typescript": "~5.4.0"
  },
  "dependencies": {
    "aws-cdk-lib": "2.170.0",
    "constructs": "^10.0.0"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["es2022"],
    "declaration": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["bin/**/*.ts", "lib/**/*.ts"]
}
```

**Step 3: Create cdk.json**

```json
{
  "app": "node_modules/.bin/ts-node bin/app.ts",
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": ["aws"]
  }
}
```

**Step 4: Install dependencies**

Run: `cd infra && pnpm install`

**Step 5: Verify**

Run: `cd infra && npx cdk --version`
Expected: `2.170.0`

---

## Task 3: Create config and stack entry point

**Files:**
- Create: `infra/lib/config.ts`
- Create: `infra/bin/app.ts`

**Step 1: Create config.ts**

```typescript
export const config = {
  accountId: "662860781475",
  region: "eu-central-1",
  prefix: "attuned-outline",
  ssmPrefix: "/outline",
  domain: "docs.attuned.ai",
  hostedZoneDomain: "attuned.ai",
  bucketName: "attuned-outline-uploads",
  instanceType: "t3.small",
  dataDiskSizeGb: 30,
  outlineVersion: "1.7.1",
};
```

**Step 2: Create bin/app.ts**

```typescript
#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { config } from "../lib/config";
import { OutlineStack } from "../lib/outline-stack";

const app = new cdk.App();

new OutlineStack(app, config.prefix, {
  config,
  env: { account: config.accountId, region: config.region },
  description: "Self-hosted Outline wiki (docs.attuned.ai)",
});
```

---

## Task 4: Create networking construct

**Files:**
- Create: `infra/lib/constructs/networking.ts`

Default VPC. HTTP/HTTPS only - no SSH port. Access via SSM Session Manager.

```typescript
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
```

---

## Task 5: Create storage construct

**Files:**
- Create: `infra/lib/constructs/storage.ts`

S3 bucket for file uploads. Instance role grants access directly - no static IAM creds.

```typescript
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface StorageProps {
  bucketName: string;
  domain: string;
}

export class OutlineStorage extends Construct {
  readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, "Uploads", {
      bucketName: props.bucketName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedOrigins: [`https://${props.domain}`],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
    });
  }
}
```

---

## Task 6: Create UserData bootstrap script

**Files:**
- Create: `infra/lib/user-data.sh`

Runs once on first boot. Installs Docker, fetches secrets from SSM, writes all config files, starts the stack. Also installs a `refresh-config.sh` helper for updating secrets later without rebuilding the instance.

```bash
#!/bin/bash
set -euo pipefail

REGION="{{REGION}}"
SSM_PREFIX="{{SSM_PREFIX}}"
DOMAIN="{{DOMAIN}}"
BUCKET_NAME="{{BUCKET_NAME}}"
OUTLINE_VERSION="{{OUTLINE_VERSION}}"

# Mount data volume (format only if new, preserves existing data)
DATA_DEVICE="/dev/xvdf"
DATA_MOUNT="/opt/outline/data"
mkdir -p "$DATA_MOUNT"
if ! blkid "$DATA_DEVICE"; then
  mkfs.ext4 "$DATA_DEVICE"
fi
mount "$DATA_DEVICE" "$DATA_MOUNT"
echo "$DATA_DEVICE $DATA_MOUNT ext4 defaults,nofail 0 2" >> /etc/fstab

# Install Docker + Compose
dnf update -y
dnf install -y docker jq
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

COMPOSE_URL="https://github.com/docker/compose/releases/latest/download"
curl -L "${COMPOSE_URL}/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# SSM helper
get_ssm() {
  aws ssm get-parameter \
    --region "$REGION" \
    --name "${SSM_PREFIX}/$1" \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text
}

# Write refresh script (re-run anytime to pick up new SSM values)
cat > /opt/outline/refresh-config.sh << 'REFRESHEOF'
#!/bin/bash
set -euo pipefail
REGION="{{REGION}}"
SSM_PREFIX="{{SSM_PREFIX}}"
DOMAIN="{{DOMAIN}}"
BUCKET_NAME="{{BUCKET_NAME}}"
OUTLINE_VERSION="{{OUTLINE_VERSION}}"
DATA_MOUNT="/opt/outline/data"

get_ssm() {
  aws ssm get-parameter \
    --region "$REGION" \
    --name "${SSM_PREFIX}/$1" \
    --with-decryption \
    --query 'Parameter.Value' \
    --output text
}

SECRET_KEY=$(get_ssm "secret-key")
UTILS_SECRET=$(get_ssm "utils-secret")
PG_PASSWORD=$(get_ssm "pg-password")
GOOGLE_CLIENT_ID=$(get_ssm "google-client-id")
GOOGLE_CLIENT_SECRET=$(get_ssm "google-client-secret")
NOTION_CLIENT_ID=$(get_ssm "notion-client-id" 2>/dev/null || echo "")
NOTION_CLIENT_SECRET=$(get_ssm "notion-client-secret" 2>/dev/null || echo "")

cd /opt/outline

cat > .env << ENVEOF
NODE_ENV=production
URL=https://${DOMAIN}
PORT=3000
SECRET_KEY=${SECRET_KEY}
UTILS_SECRET=${UTILS_SECRET}
FORCE_HTTPS=true
WEB_CONCURRENCY=2

DATABASE_URL=postgres://outline:${PG_PASSWORD}@postgres:5432/outline
PGSSLMODE=disable
REDIS_URL=redis://redis:6379

GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}

FILE_STORAGE=s3
AWS_S3_UPLOAD_BUCKET_NAME=${BUCKET_NAME}
AWS_S3_UPLOAD_BUCKET_URL=https://s3.${REGION}.amazonaws.com/${BUCKET_NAME}
AWS_S3_FORCE_PATH_STYLE=false
AWS_S3_ACL=private
ENVEOF

if [ -n "$NOTION_CLIENT_ID" ]; then
  echo "NOTION_CLIENT_ID=${NOTION_CLIENT_ID}" >> .env
  echo "NOTION_CLIENT_SECRET=${NOTION_CLIENT_SECRET}" >> .env
fi

cat > docker-compose.yml << COMPOSEEOF
services:
  outline:
    image: outlinewiki/outline:${OUTLINE_VERSION}
    env_file: .env
    ports:
      - "3000:3000"
    volumes:
      - outline-data:/var/lib/outline/data
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/_health"]
      interval: 60s
      timeout: 5s
      retries: 3

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: outline
      POSTGRES_PASSWORD: ${PG_PASSWORD}
      POSTGRES_DB: outline
    volumes:
      - ${DATA_MOUNT}/postgres:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U outline"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
      - caddy-config:/config
    depends_on:
      outline:
        condition: service_healthy
    restart: unless-stopped

volumes:
  outline-data:
  caddy-data:
  caddy-config:
COMPOSEEOF

cat > Caddyfile << CADDYEOF
${DOMAIN} {
    reverse_proxy outline:3000
}
CADDYEOF

echo "Config refreshed at $(date)"
REFRESHEOF
chmod +x /opt/outline/refresh-config.sh

# Run initial config
/opt/outline/refresh-config.sh

# Backup script (daily cron)
cat > /opt/outline/backup.sh << 'BACKUPEOF'
#!/bin/bash
set -euo pipefail
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BUCKET=$(grep AWS_S3_UPLOAD_BUCKET_NAME /opt/outline/.env | cut -d= -f2)
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region)

docker exec $(docker ps -qf name=postgres) \
  pg_dump -U outline outline | \
  gzip > "/tmp/outline-db-${TIMESTAMP}.sql.gz"

aws s3 cp \
  "/tmp/outline-db-${TIMESTAMP}.sql.gz" \
  "s3://${BUCKET}/backups/outline-db-${TIMESTAMP}.sql.gz" \
  --region "$REGION"

rm "/tmp/outline-db-${TIMESTAMP}.sql.gz"
echo "Backup complete: ${TIMESTAMP}"
BACKUPEOF
chmod +x /opt/outline/backup.sh
echo "0 3 * * * /opt/outline/backup.sh >> /var/log/outline-backup.log 2>&1" | crontab -

# Start the stack
cd /opt/outline
docker-compose up -d
```

Placeholders (`{{REGION}}`, etc.) are replaced by CDK in the instance construct.

---

## Task 7: Create instance construct

**Files:**
- Create: `infra/lib/constructs/instance.ts`

EC2 with instance role (SSM Session Manager + SSM params read + S3 read/write). Standalone EBS data volume with RETAIN policy - survives instance replacement.

```typescript
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
      eip: this.eip.ref,
      instanceId: this.instance.instanceId,
    });
  }
}
```

Data volume is a standalone CDK resource. If CDK replaces the instance (AMI change, instance type change, etc.), the volume persists and reattaches to the new instance. UserData's `blkid` check skips formatting if data already exists.

---

## Task 8: Create DNS construct

**Files:**
- Create: `infra/lib/constructs/dns.ts`

```typescript
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
```

---

## Task 9: Create the main stack

**Files:**
- Create: `infra/lib/outline-stack.ts`

```typescript
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
```

**Verify synth:**

Run: `cd infra && npx cdk synth`
Expected: CloudFormation template, no errors.

---

## Task 10: Set up Google OAuth (manual, Jon does this)

1. Go to https://console.cloud.google.com/apis/credentials
2. Select or create a GCP project for attuned.ai
3. "Create Credentials" > "OAuth client ID" > "Web application"
4. Name: "Outline Wiki"
5. Authorized redirect URI: `https://docs.attuned.ai/api/google.callback`
6. Copy Client ID and Client Secret for Task 11

Only `@attuned.ai` accounts can sign in (Outline reads the `hd` claim automatically).

---

## Task 11: Seed SSM parameters (pre-deploy, one-time)

```bash
aws ssm put-parameter --region eu-central-1 \
  --name "/outline/secret-key" \
  --type SecureString \
  --value "$(openssl rand -hex 32)"

aws ssm put-parameter --region eu-central-1 \
  --name "/outline/utils-secret" \
  --type SecureString \
  --value "$(openssl rand -hex 32)"

aws ssm put-parameter --region eu-central-1 \
  --name "/outline/pg-password" \
  --type SecureString \
  --value "$(openssl rand -hex 16)"

aws ssm put-parameter --region eu-central-1 \
  --name "/outline/google-client-id" \
  --type SecureString \
  --value "<CLIENT_ID from Task 10>"

aws ssm put-parameter --region eu-central-1 \
  --name "/outline/google-client-secret" \
  --type SecureString \
  --value "<CLIENT_SECRET from Task 10>"
```

**Verify:**

```bash
aws ssm get-parameters-by-path \
  --region eu-central-1 \
  --path "/outline" \
  --query 'Parameters[].Name' \
  --output table
```

Expected: 5 parameters.

---

## Task 12: Deploy

```bash
cd ~/Programming/attuned/attuned.outline/infra
npx cdk deploy
```

**Verify:**
1. Check CfnOutput for PublicIp and URL
2. Wait ~3 minutes for UserData to complete
3. `curl -s https://docs.attuned.ai/_health` - Expected: `OK`
4. Open `https://docs.attuned.ai` in browser, sign in with @attuned.ai Google account

**Debug if needed** (via SSM Session Manager, no SSH):
```bash
INSTANCE_ID=$(aws ec2 describe-instances \
  --region eu-central-1 \
  --filters \
    Name=tag:Name,Values=attuned-outline \
    Name=instance-state-name,Values=running \
  --query 'Reservations[].Instances[0].InstanceId' \
  --output text)

aws ssm start-session \
  --region eu-central-1 \
  --target "$INSTANCE_ID"

# Then on the instance:
sudo cat /var/log/cloud-init-output.log | tail -50
cd /opt/outline && docker-compose logs outline
```

---

## Task 13: Notion import (post-deploy)

**Step 1: Create Notion public integration**

1. Go to https://www.notion.so/my-integrations
2. "New integration" > Name: "Outline Import"
3. Type: **Public** (not internal - OAuth requires public)
4. Redirect URI: `https://docs.attuned.ai/api/notion.callback`
5. Copy Client ID and Client Secret

**Step 2: Store in SSM**

```bash
aws ssm put-parameter --region eu-central-1 \
  --name "/outline/notion-client-id" \
  --type SecureString \
  --value "<NOTION_CLIENT_ID>"

aws ssm put-parameter --region eu-central-1 \
  --name "/outline/notion-client-secret" \
  --type SecureString \
  --value "<NOTION_CLIENT_SECRET>"
```

**Step 3: Refresh config on the instance**

```bash
aws ssm start-session \
  --region eu-central-1 \
  --target "$INSTANCE_ID"

# On the instance:
sudo /opt/outline/refresh-config.sh
cd /opt/outline && sudo docker-compose up -d
```

**Step 4: Run the import**

1. In Outline, Settings > Import > Notion
2. Authorize via Notion OAuth
3. Select workspace pages to import
4. Wait for background tasks to complete

**Known limitations:**
- Databases import as flat pages (no views, relations, formulas)
- Linked databases skipped
- Large workspaces may timeout (3 req/sec rate limit)
- One-time import, not ongoing sync

---

## Task 14: Upgrade procedure (reference)

**Update Outline version:**

```bash
aws ssm start-session \
  --region eu-central-1 \
  --target "$INSTANCE_ID"

# On the instance:
cd /opt/outline
sudo ./backup.sh
sudo sed -i 's/outlinewiki\/outline:.*/outlinewiki\/outline:X.Y.Z/' \
  docker-compose.yml
sudo docker-compose pull outline
sudo docker-compose up -d outline
sudo docker-compose logs -f outline
```

Also update `outlineVersion` in `infra/lib/config.ts` to keep CDK in sync.

**Pull upstream into fork:**

```bash
cd ~/Programming/attuned/attuned.outline
git fetch upstream
git merge upstream/main
git push origin main
```
