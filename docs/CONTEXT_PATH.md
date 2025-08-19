# Custom Context Path Setup

This guide explains how to configure Outline to run at a custom context path (subpath) such as `example.com/wiki` instead of the root domain.

## Overview

A context path allows you to deploy Outline at a subpath of your domain. This is useful when:
- You want to serve multiple applications from the same domain
- You're using a reverse proxy setup
- You're deploying behind a load balancer with path-based routing

## Configuration

### Environment Variable

Set the `CONTEXT_PATH` environment variable to your desired path:

```bash
# Example: Deploy at example.com/wiki
CONTEXT_PATH="/wiki"

# Example: Deploy at example.com/docs/outline  
CONTEXT_PATH="/docs/outline"

# Example: Deploy at root (default behavior)
CONTEXT_PATH=""
```

### Important Notes

1. **Path Format**: 
   - Must start with `/` (forward slash)
   - Must NOT end with `/`
   - Only contain valid URL characters: `[a-zA-Z0-9\-._~!$&'()*+,;=:@]`

2. **Valid Examples**:
   - `CONTEXT_PATH="/wiki"`
   - `CONTEXT_PATH="/docs"`
   - `CONTEXT_PATH="/internal/knowledge"`

3. **Invalid Examples**:
   - `CONTEXT_PATH="wiki"` (missing leading slash)
   - `CONTEXT_PATH="/wiki/"` (trailing slash)
   - `CONTEXT_PATH="/wi ki"` (spaces not allowed)

## Reverse Proxy Configuration

When using a reverse proxy (nginx, Apache, etc.), ensure your proxy configuration matches the context path.

### Nginx Example

```nginx
location /wiki/ {
    proxy_pass http://outline-backend:3000/wiki/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Apache Example

```apache
ProxyPass /wiki/ http://outline-backend:3000/wiki/
ProxyPassReverse /wiki/ http://outline-backend:3000/wiki/
ProxyPreserveHost On
```

## Docker Configuration

When using Docker, set the environment variable in your docker-compose.yml:

```yaml
version: '3.8'
services:
  outline:
    image: outline/outline:latest
    environment:
      - CONTEXT_PATH=/wiki
      - URL=https://example.com/wiki
      # ... other environment variables
```

## URL Configuration

When using a context path, update your `URL` environment variable to include the full path:

```bash
# If deploying at example.com/wiki
URL=https://example.com/wiki
CONTEXT_PATH=/wiki
```

## What Gets Updated

The context path configuration affects:

1. **Server Routes**: All API and static routes are prefixed with the context path
2. **Frontend Router**: React Router uses the context path as basename
3. **Static Assets**: CSS, JavaScript, and image paths include the context path
4. **Service Worker**: Registration and scope respect the context path
5. **Manifest**: Web app manifest URL includes the context path

## Troubleshooting

### Assets Not Loading

If CSS, JavaScript, or images aren't loading:
1. Check that `CDN_URL` (if used) is correctly configured
2. Verify reverse proxy configuration passes requests to the correct backend path
3. Ensure `URL` environment variable includes the context path

### Authentication Issues

If authentication redirects aren't working:
1. Verify OAuth provider callback URLs include the context path
2. Check that the `URL` environment variable is correct
3. Ensure cookies are being set for the correct path

### API Requests Failing

If API requests return 404 errors:
1. Check browser network tab to see the actual request URLs
2. Verify reverse proxy passes `/api` requests correctly
3. Ensure the backend is properly configured with the context path

## Migration from Root Deployment

To migrate an existing root deployment to use a context path:

1. **Update Environment Variables**:
   ```bash
   CONTEXT_PATH=/your-path
   URL=https://yourdomain.com/your-path
   ```

2. **Update Reverse Proxy Configuration** to route requests to the new path

3. **Update OAuth Provider Settings** with new callback URLs

4. **Restart Application** to apply changes

5. **Test All Functionality** including authentication, file uploads, and API access

## Examples

### Simple Wiki Deployment
```bash
URL=https://company.com/wiki
CONTEXT_PATH=/wiki
```

### Multi-tenant Setup
```bash
URL=https://apps.company.com/outline
CONTEXT_PATH=/outline
```

### Development Setup
```bash
URL=http://localhost:3000/dev
CONTEXT_PATH=/dev
```

## Security Considerations

- Ensure your reverse proxy doesn't expose the application at both the root and context path
- Configure proper SSL termination if using HTTPS
- Update Content Security Policy headers if customized
- Review authentication provider settings for the new URLs
