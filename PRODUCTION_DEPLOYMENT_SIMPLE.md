# Production Deployment Guide: Outline (Without Authelia)

This guide covers deploying Outline to production using standard authentication providers (OAuth, SAML, etc.) without the experimental Authelia integration.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Server Setup](#server-setup)
- [DNS and SSL Configuration](#dns-and-ssl-configuration)
- [Deployment Options](#deployment-options)
- [Environment Configuration](#environment-configuration)
- [Authentication Providers](#authentication-providers)
- [Security Considerations](#security-considerations)
- [Monitoring and Backups](#monitoring-and-backups)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Server Requirements
- **OS**: Ubuntu 20.04 LTS or newer
- **RAM**: Minimum 2GB, Recommended 4GB+
- **CPU**: 2+ cores
- **Storage**: 20GB+ SSD
- **Domain**: `wiki.yourdomain.com` with SSL certificate

### Software Requirements
- Docker Engine 20.10+
- Docker Compose 2.0+
- Node.js 18-20 (if building from source)
- Git

## Server Setup

### 1. Initial Server Configuration
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply docker group changes
```

### 2. Firewall Configuration
```bash
# Configure UFW
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw enable

# Optional: Restrict SSH to specific IP
# sudo ufw allow from YOUR_IP to any port 22
```

### 3. Create Deployment Directory
```bash
sudo mkdir -p /opt/outline
cd /opt/outline
sudo chown -R $USER:$USER /opt/outline
```

## DNS and SSL Configuration

### DNS Setup
```bash
# Add A record in your DNS provider:
wiki.yourdomain.com -> YOUR_SERVER_IP

# Verify DNS propagation
dig wiki.yourdomain.com
```

### SSL Certificate (Let's Encrypt)
```bash
# Install Certbot
sudo snap install --classic certbot

# Obtain certificate
sudo certbot certonly --standalone -d wiki.yourdomain.com

# Certificates will be in /etc/letsencrypt/live/wiki.yourdomain.com/
```

## Deployment Options

Choose one of the following deployment methods:

### Option 1: Docker Compose (Recommended)

Create the production docker-compose file:

```yaml
# /opt/outline/docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: outline_redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "auth", "${REDIS_PASSWORD}", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:15-alpine
    container_name: outline_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 30s
      timeout: 10s
      retries: 3

  outline:
    image: outlinewiki/outline:latest
    container_name: outline_app
    restart: unless-stopped
    environment:
      # Database
      DATABASE_URL: postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      PGSSLMODE: disable
      
      # Application
      URL: https://${OUTLINE_DOMAIN}
      PORT: 3000
      SECRET_KEY: ${SECRET_KEY}
      UTILS_SECRET: ${UTILS_SECRET}
      
      # Features
      ENABLE_UPDATES: "true"
      WEB_CONCURRENCY: "2"
      DEFAULT_LANGUAGE: en_US
      
      # File Storage
      FILE_STORAGE: local
      FILE_STORAGE_LOCAL_ROOT_DIR: /var/lib/outline/data
      FILE_STORAGE_UPLOAD_MAX_SIZE: 262144000
      
      # SMTP (required for invitations)
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USERNAME: ${SMTP_USERNAME}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      SMTP_FROM_EMAIL: ${SMTP_FROM_EMAIL}
      SMTP_SECURE: "true"
      
      # Authentication - Choose ONE provider below
      # Google OAuth
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      
      # GitHub OAuth (alternative)
      # GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
      # GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}
      
      # Slack OAuth (alternative)
      # SLACK_CLIENT_ID: ${SLACK_CLIENT_ID}
      # SLACK_CLIENT_SECRET: ${SLACK_CLIENT_SECRET}
      
      # Azure AD (alternative)
      # AZURE_CLIENT_ID: ${AZURE_CLIENT_ID}
      # AZURE_CLIENT_SECRET: ${AZURE_CLIENT_SECRET}
      # AZURE_RESOURCE_APP_ID: ${AZURE_RESOURCE_APP_ID}
      
      # OIDC (alternative)
      # OIDC_CLIENT_ID: ${OIDC_CLIENT_ID}
      # OIDC_CLIENT_SECRET: ${OIDC_CLIENT_SECRET}
      # OIDC_AUTH_URI: ${OIDC_AUTH_URI}
      # OIDC_TOKEN_URI: ${OIDC_TOKEN_URI}
      # OIDC_USERINFO_URI: ${OIDC_USERINFO_URI}
      # OIDC_USERNAME_CLAIM: preferred_username
      # OIDC_DISPLAY_NAME: "Custom OIDC"
      # OIDC_SCOPES: "openid profile email"
      
    volumes:
      - outline_data:/var/lib/outline/data
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/_health"]
      interval: 30s
      timeout: 10s
      retries: 3

  nginx:
    image: nginx:alpine
    container_name: outline_nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - nginx_logs:/var/log/nginx
    depends_on:
      - outline

volumes:
  postgres_data:
  redis_data:
  outline_data:
  nginx_logs:
```

### Option 2: Direct Build from Source

```yaml
# Alternative outline service for building from source
  outline:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: outline_app
    # ... rest of configuration same as above
```

## Environment Configuration

Create `/opt/outline/.env`:

```bash
# Domain Configuration
OUTLINE_DOMAIN=wiki.yourdomain.com

# Database Configuration
POSTGRES_USER=outline_user
POSTGRES_PASSWORD=CHANGE_THIS_STRONG_PASSWORD_123!
POSTGRES_DB=outline

# Redis Configuration  
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD_456!

# Application Secrets (generate with: openssl rand -hex 32)
SECRET_KEY=CHANGE_THIS_32_CHAR_SECRET_KEY_HERE_789
UTILS_SECRET=CHANGE_THIS_32_CHAR_UTILS_SECRET_ABC

# SMTP Configuration
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USERNAME=noreply@yourdomain.com
SMTP_PASSWORD=CHANGE_THIS_SMTP_PASSWORD_DEF
SMTP_FROM_EMAIL=wiki@yourdomain.com

# Authentication Provider (Google OAuth example)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Optional: Slack integration
# SLACK_CLIENT_ID=your-slack-client-id
# SLACK_CLIENT_SECRET=your-slack-client-secret

# Optional: GitHub integration  
# GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret
```

**Generate secure secrets:**
```bash
# Generate secrets
openssl rand -hex 32  # For SECRET_KEY and UTILS_SECRET
openssl rand -base64 32  # For passwords
```

## Authentication Providers

### Google OAuth Setup

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google+ API**
   - APIs & Services → Library
   - Search for "Google+ API" and enable it

3. **Create OAuth Credentials**
   - APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client IDs
   - Application type: Web application
   - Authorized redirect URIs: `https://wiki.yourdomain.com/auth/google.callback`

4. **Update Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

### GitHub OAuth Setup (Alternative)

1. **GitHub Settings**
   - Go to GitHub Settings → Developer settings → OAuth Apps
   - New OAuth App

2. **Application Details**
   - Application name: Your Wiki
   - Homepage URL: `https://wiki.yourdomain.com`
   - Authorization callback URL: `https://wiki.yourdomain.com/auth/github.callback`

3. **Update Environment Variables**
   ```bash
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

### Slack OAuth Setup (Alternative)

1. **Create Slack App**
   - Visit https://api.slack.com/apps
   - Create New App → From scratch

2. **OAuth & Permissions**
   - Redirect URLs: `https://wiki.yourdomain.com/auth/slack.callback`
   - Scopes: `identity.basic`, `identity.email`, `identity.team`

3. **Update Environment Variables**
   ```bash
   SLACK_CLIENT_ID=your-slack-client-id
   SLACK_CLIENT_SECRET=your-slack-client-secret
   ```

## Nginx Configuration

Create `/opt/outline/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream outline {
        server outline:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

    server {
        listen 80;
        server_name wiki.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name wiki.yourdomain.com;

        # SSL Configuration
        ssl_certificate /etc/letsencrypt/live/wiki.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/wiki.yourdomain.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # File upload size
        client_max_body_size 100M;

        # Rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://outline;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /auth/ {
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://outline;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location / {
            proxy_pass http://outline;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # Health check endpoint
        location /_health {
            access_log off;
            proxy_pass http://outline;
        }

        # Logging
        access_log /var/log/nginx/outline_access.log;
        error_log /var/log/nginx/outline_error.log;
    }
}
```

## Deployment Commands

### 1. Initial Deployment
```bash
cd /opt/outline

# Set proper permissions
chmod 600 .env
chmod 644 docker-compose.yml nginx.conf

# Start services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f outline
```

### 2. Create First Admin User
```bash
# Visit your domain in browser
https://wiki.yourdomain.com

# First user to register becomes admin
# Use your Google/GitHub/Slack account to sign in
```

### 3. SSL Certificate Renewal
```bash
# Add to crontab for automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx" | sudo crontab -
```

## Security Considerations

### 1. Environment Variables Security
```bash
# Restrict access to environment file
chmod 600 /opt/outline/.env
chown root:root /opt/outline/.env
```

### 2. Database Security
```bash
# Backup database regularly
docker-compose exec postgres pg_dump -U outline_user outline > backup_$(date +%Y%m%d).sql

# Rotate database password periodically
# Update .env file and restart services
```

### 3. Network Security
```bash
# Use strong passwords everywhere
# Enable fail2ban for additional protection
sudo apt install fail2ban

# Create custom jail for Outline
sudo tee /etc/fail2ban/jail.local << EOF
[nginx-outline]
enabled = true
port = http,https
filter = nginx-limit-req
logpath = /opt/outline/nginx_logs/outline_error.log
maxretry = 5
bantime = 3600
EOF

sudo systemctl restart fail2ban
```

### 4. Regular Updates
```bash
# Create update script
cat > /opt/outline/update.sh << 'EOF'
#!/bin/bash
cd /opt/outline

# Backup before update
docker-compose exec postgres pg_dump -U $POSTGRES_USER outline > backup_$(date +%Y%m%d_%H%M%S).sql

# Pull latest images
docker-compose pull

# Restart services
docker-compose up -d

# Clean old images
docker image prune -f

echo "Update completed at $(date)"
EOF

chmod +x /opt/outline/update.sh

# Run monthly
echo "0 2 1 * * /opt/outline/update.sh" | crontab -
```

## Monitoring and Backups

### 1. Health Monitoring Script
```bash
# Create monitoring script
cat > /opt/outline/health-check.sh << 'EOF'
#!/bin/bash
cd /opt/outline

# Check if services are running
if ! docker-compose ps | grep -q "Up.*healthy"; then
    echo "$(date): WARNING - Some services are not healthy"
    docker-compose ps
    # Send alert (configure email/webhook)
fi

# Check disk space
DISK_USAGE=$(df /opt/outline | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): WARNING - Disk usage is ${DISK_USAGE}%"
    # Send alert
fi

# Check SSL certificate expiry
CERT_EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/wiki.yourdomain.com/cert.pem | cut -d= -f2)
EXPIRY_DATE=$(date -d "$CERT_EXPIRY" +%s)
CURRENT_DATE=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_DATE - $CURRENT_DATE) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "$(date): WARNING - SSL certificate expires in $DAYS_UNTIL_EXPIRY days"
    # Send alert
fi
EOF

chmod +x /opt/outline/health-check.sh

# Run every 15 minutes
echo "*/15 * * * * /opt/outline/health-check.sh >> /var/log/outline-health.log" | crontab -
```

### 2. Backup Strategy
```bash
# Create comprehensive backup script
cat > /opt/outline/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/outline/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
docker-compose exec -T postgres pg_dump -U $POSTGRES_USER outline > "$BACKUP_DIR/outline_db_$DATE.sql"

# Application data backup
docker-compose exec -T outline tar -czf - -C /var/lib/outline/data . > "$BACKUP_DIR/outline_data_$DATE.tar.gz"

# Configuration backup
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" .env docker-compose.yml nginx.conf

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/outline/backup.sh

# Daily backups at 2 AM
echo "0 2 * * * /opt/outline/backup.sh" | crontab -
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check logs
docker-compose logs outline

# Common causes:
# - Database connection issues
# - Missing environment variables
# - Port conflicts

# Debug database connection
docker-compose exec outline npm run db:migrate
```

#### 2. Authentication Issues
```bash
# Verify OAuth configuration
# Check redirect URLs match exactly
# Ensure OAuth app is active

# Test SMTP settings
docker-compose exec outline node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD
  }
});
transporter.verify((error, success) => {
  if(error) console.log('SMTP Error:', error);
  else console.log('SMTP OK');
});
"
```

#### 3. File Upload Issues
```bash
# Check file permissions
docker-compose exec outline ls -la /var/lib/outline/data

# Check Nginx configuration
docker-compose exec nginx nginx -t

# Increase upload limits if needed
# Update client_max_body_size in nginx.conf
```

#### 4. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -text -noout -in /etc/letsencrypt/live/wiki.yourdomain.com/cert.pem

# Renew certificate manually
sudo certbot renew --force-renewal

# Restart Nginx
docker-compose restart nginx
```

### Performance Optimization

#### 1. Database Optimization
```bash
# Add to docker-compose.yml postgres service
environment:
  POSTGRES_SHARED_PRELOAD_LIBRARIES: pg_stat_statements
  POSTGRES_MAX_CONNECTIONS: 100
  POSTGRES_SHARED_BUFFERS: 256MB
  POSTGRES_EFFECTIVE_CACHE_SIZE: 1GB

# Monitor database performance
docker-compose exec postgres psql -U $POSTGRES_USER -d outline -c "
SELECT query, calls, total_time, rows, 100.0 * shared_blks_hit /
    nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements ORDER BY total_time DESC LIMIT 5;
"
```

#### 2. Redis Optimization
```bash
# Add to docker-compose.yml redis service
command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --requirepass ${REDIS_PASSWORD}
```

#### 3. Application Optimization
```bash
# Increase worker processes for higher load
WEB_CONCURRENCY: "4"  # Adjust based on CPU cores

# Enable compression
GZIP_ENABLED: "true"
```

## Migration from Development

If you're migrating from your local `make up` setup:

### 1. Export Data
```bash
# From your local setup
docker-compose exec postgres pg_dump -U user outline > local_backup.sql

# Copy uploaded files
docker cp outline:/var/lib/outline/data ./local_data
```

### 2. Import to Production
```bash
# On production server
scp local_backup.sql your-server:/opt/outline/
scp -r local_data your-server:/opt/outline/

# Import database
docker-compose exec -T postgres psql -U $POSTGRES_USER -d outline < local_backup.sql

# Import files
docker cp local_data outline:/var/lib/outline/data
docker-compose exec outline chown -R node:node /var/lib/outline/data
```

## Production Checklist

### Pre-Deployment
- [ ] Server configured and secured
- [ ] DNS records configured
- [ ] SSL certificates obtained
- [ ] Environment variables configured
- [ ] OAuth provider configured
- [ ] SMTP server configured
- [ ] Backup strategy implemented

### Post-Deployment
- [ ] All services healthy
- [ ] Can access application via HTTPS
- [ ] Authentication working
- [ ] Email notifications working
- [ ] File uploads working
- [ ] Monitoring configured
- [ ] Backups tested

### Security Review
- [ ] Strong passwords used
- [ ] SSL certificate valid
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Fail2ban configured
- [ ] Regular updates scheduled

This guide provides a robust, production-ready Outline deployment without experimental features like Authelia. The setup uses proven technologies and includes comprehensive monitoring, backups, and security measures.