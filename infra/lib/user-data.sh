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

# Wait for volume to attach
while [ ! -b "$DATA_DEVICE" ]; do
  echo "Waiting for $DATA_DEVICE..."
  sleep 2
done

if ! blkid "$DATA_DEVICE"; then
  mkfs.ext4 "$DATA_DEVICE"
fi
mount "$DATA_DEVICE" "$DATA_MOUNT"
grep -q "$DATA_DEVICE" /etc/fstab || \
  echo "$DATA_DEVICE $DATA_MOUNT ext4 defaults,nofail 0 2" >> /etc/fstab

# Install Docker + Compose
dnf update -y
dnf install -y docker jq cronie
systemctl enable docker
systemctl start docker
usermod -aG docker ec2-user

COMPOSE_URL="https://github.com/docker/compose/releases/latest/download"
curl -L "${COMPOSE_URL}/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Write refresh script (re-run anytime to pick up new SSM values)
mkdir -p /opt/outline
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
AWS_REGION=${REGION}
AWS_S3_UPLOAD_BUCKET_NAME=${BUCKET_NAME}
AWS_S3_UPLOAD_BUCKET_URL=https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com
AWS_S3_FORCE_PATH_STYLE=false
AWS_S3_ACL=private
FILE_STORAGE_UPLOAD_MAX_SIZE=2684354560
FILE_STORAGE_IMPORT_MAX_SIZE=3221225472
FILE_STORAGE_WORKSPACE_IMPORT_MAX_SIZE=3221225472
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
    request_body {
        max_size 3GB
    }
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
