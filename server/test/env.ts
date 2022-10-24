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
env.OIDC_CLIENT_ID = undefined;
env.OIDC_CLIENT_SECRET = undefined;

env.RATE_LIMITER_ENABLED = false;
env.DEPLOYMENT = undefined;

if (process.env.DATABASE_URL_TEST) {
  env.DATABASE_URL = process.env.DATABASE_URL_TEST;
}
