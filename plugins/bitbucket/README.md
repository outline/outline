# Bitbucket Integration for Outline

This plugin adds Bitbucket integration to Outline, allowing users to:

- Unfurl Bitbucket issues and pull requests in documents
- Mention Bitbucket issues and pull requests using @ mentions

## Features

- **App Password Authentication**: Secure connection to Bitbucket using app passwords
- **Link Unfurling**: Rich previews of Bitbucket issues and pull requests
- **@ Mentions**: Mention Bitbucket issues and pull requests in documents
- **Server-level Configuration**: Simple setup with environment variables

## Setup

### 1. Create a Bitbucket App Password

1. Go to [Bitbucket App Passwords](https://bitbucket.org/account/settings/app-passwords/)
2. Click "Create app password"
3. Give it a descriptive name (e.g., "Outline Integration")
4. Select the following permissions:
   - **Repositories**: Read
   - **Issues**: Read
   - **Pull requests**: Read
5. Click "Create"
6. Copy the generated app password (you won't be able to see it again)

### 2. Environment Variables

Add the following environment variables to your Outline server:

```bash
BITBUCKET_USERNAME=your_bitbucket_username
BITBUCKET_APP_PASSWORD=your_app_password_here
BITBUCKET_WEBHOOK_SECRET=your_webhook_secret_here  # Optional
```

### 3. Restart the Server

After adding the environment variables, restart your Outline server for the changes to take effect.

## Usage

### Using Bitbucket Links

Once configured, you can:

- Paste Bitbucket issue URLs (e.g., `https://bitbucket.org/owner/repo/issues/123`) to get rich previews
- Paste Bitbucket pull request URLs (e.g., `https://bitbucket.org/owner/repo/pull-requests/456`) to get rich previews
- Use @ mentions to reference Bitbucket issues and pull requests

### Supported URL Formats

- Issues: `https://bitbucket.org/{owner}/{repo}/issues/{id}`
- Pull Requests: `https://bitbucket.org/{owner}/{repo}/pull-requests/{id}`

## Architecture

The integration consists of:

- **Server-side**: App password authentication, API integration, unfurling logic
- **Client-side**: Settings UI showing configuration status
- **Shared**: Utilities and types used by both client and server

### Key Files

- `server/bitbucket.ts` - Main Bitbucket API integration
- `client/Settings.tsx` - Settings UI component
- `shared/BitbucketUtils.ts` - Shared utilities

## Development

To work on this integration:

1. Ensure you have the environment variables set
2. The plugin will automatically register itself when the server starts
3. Check the server logs for any integration-related errors
4. Test the link unfurling functionality

## Troubleshooting

### Common Issues

1. **Authentication Error**: Check that your username and app password are correct
2. **Environment Variables**: Ensure all required variables are set
3. **Permissions**: Make sure the app password has the required permissions

### Debugging

Check the server logs for any Bitbucket-related errors. The integration logs important events and errors for debugging.

## Security Notes

- App passwords are stored securely in environment variables
- The integration only has read access to repositories, issues, and pull requests
- No user data is stored in the database
- The integration works at the server level, not per-user
