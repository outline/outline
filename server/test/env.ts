import env from "../env";

// test environment variables
env.SMTP_HOST = "smtp.example.com";
env.ENVIRONMENT = "test";
env.GOOGLE_CLIENT_ID = "123";
env.GOOGLE_CLIENT_SECRET = "123";
env.SLACK_CLIENT_ID = "123";
env.SLACK_CLIENT_SECRET = "123";

env.AZURE_CLIENT_ID = undefined;
env.AZURE_CLIENT_SECRET = undefined;
env.OIDC_CLIENT_ID = "client-id";
env.OIDC_CLIENT_SECRET = "client-secret";
env.OIDC_AUTH_URI = "http://localhost/authorize";
env.OIDC_TOKEN_URI = "http://localhost/token";
env.OIDC_USERINFO_URI = "http://localhost/userinfo";

env.RATE_LIMITER_ENABLED = false;

env.FILE_STORAGE = "local";
env.FILE_STORAGE_LOCAL_ROOT_DIR = "/tmp";
env.IFRAMELY_API_KEY = "123";

if (process.env.DATABASE_URL_TEST) {
  env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
