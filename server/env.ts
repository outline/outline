/* eslint-disable @typescript-eslint/no-var-requires */

// Load the process environment variables
require("dotenv").config({
  silent: true,
});

import {
  validate,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  IsByteLength,
  Equals,
  IsNumber,
  IsIn,
  IsEmail,
  IsBoolean,
  MaxLength,
} from "class-validator";
import { languages } from "@shared/i18n";
import { CannotUseWithout } from "@server/utils/validators";
import Deprecated from "./models/decorators/Deprecated";
import { getArg } from "./utils/args";

export class Environment {
  private validationPromise;

  constructor() {
    this.validationPromise = validate(this);
  }

  /**
   * Allows waiting on the environment to be validated.
   *
   * @returns A promise that resolves when the environment is validated.
   */
  public validate() {
    return this.validationPromise;
  }

  /**
   * The current envionment name.
   */
  @IsIn(["development", "production", "staging", "test"])
  public ENVIRONMENT = process.env.NODE_ENV ?? "production";

  /**
   * The secret key is used for encrypting data. Do not change this value once
   * set or your users will be unable to login.
   */
  @IsByteLength(32, 64)
  public SECRET_KEY = process.env.SECRET_KEY ?? "";

  /**
   * The secret that should be passed to the cron utility endpoint to enable
   * triggering of scheduled tasks.
   */
  @IsNotEmpty()
  public UTILS_SECRET = process.env.UTILS_SECRET ?? "";

  /**
   * The url of the database.
   */
  @IsNotEmpty()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
    protocols: ["postgres", "postgresql"],
  })
  public DATABASE_URL = process.env.DATABASE_URL ?? "";

  /**
   * The url of the database pool.
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
    protocols: ["postgres", "postgresql"],
  })
  public DATABASE_CONNECTION_POOL_URL = this.toOptionalString(
    process.env.DATABASE_CONNECTION_POOL_URL
  );

  /**
   * Database connection pool configuration.
   */
  @IsNumber()
  @IsOptional()
  public DATABASE_CONNECTION_POOL_MIN = this.toOptionalNumber(
    process.env.DATABASE_CONNECTION_POOL_MIN
  );

  /**
   * Database connection pool configuration.
   */
  @IsNumber()
  @IsOptional()
  public DATABASE_CONNECTION_POOL_MAX = this.toOptionalNumber(
    process.env.DATABASE_CONNECTION_POOL_MAX
  );

  /**
   * Set to "disable" to disable SSL connection to the database. This option is
   * passed through to Postgres. See:
   *
   * https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNECT-SSLMODE
   */
  @IsIn(["disable", "allow", "require", "prefer", "verify-ca", "verify-full"])
  @IsOptional()
  public PGSSLMODE = process.env.PGSSLMODE;

  /**
   * The url of redis. Note that redis does not have a database after the port.
   * Note: More extensive validation isn't included here due to our support for
   * base64-encoded configuration.
   */
  @IsNotEmpty()
  public REDIS_URL = process.env.REDIS_URL;

  /**
   * The fully qualified, external facing domain name of the server.
   */
  @IsNotEmpty()
  @IsUrl({ require_tld: false })
  public URL = process.env.URL || "";

  /**
   * If using a Cloudfront/Cloudflare distribution or similar it can be set below.
   * This will cause paths to javascript, stylesheets, and images to be updated to
   * the hostname defined in CDN_URL. In your CDN configuration the origin server
   * should be set to the same as URL.
   */
  @IsOptional()
  @IsUrl()
  public CDN_URL = this.toOptionalString(process.env.CDN_URL);

  /**
   * The fully qualified, external facing domain name of the collaboration
   * service, if different (unlikely)
   */
  @IsUrl({ require_tld: false, protocols: ["http", "https", "ws", "wss"] })
  @IsOptional()
  public COLLABORATION_URL = this.toOptionalString(
    process.env.COLLABORATION_URL
  );

  /**
   * The maximum number of network clients that can be connected to a single
   * document at once. Defaults to 100.
   */
  @IsOptional()
  @IsNumber()
  public COLLABORATION_MAX_CLIENTS_PER_DOCUMENT = parseInt(
    process.env.COLLABORATION_MAX_CLIENTS_PER_DOCUMENT || "100",
    10
  );

  /**
   * The port that the server will listen on, defaults to 3000.
   */
  @IsNumber()
  @IsOptional()
  public PORT = this.toOptionalNumber(process.env.PORT);

  /**
   * Optional extra debugging. Comma separated
   */
  public DEBUG = process.env.DEBUG || "";

  /**
   * Configure lowest severity level for server logs
   */
  @IsIn(["error", "warn", "info", "http", "verbose", "debug", "silly"])
  public LOG_LEVEL = process.env.LOG_LEVEL || "info";

  /**
   * How many processes should be spawned. As a reasonable rule divide your
   * server's available memory by 512 for a rough estimate
   */
  @IsNumber()
  @IsOptional()
  public WEB_CONCURRENCY = this.toOptionalNumber(process.env.WEB_CONCURRENCY);

  /**
   * How long a request should be processed before giving up and returning an
   * error response to the client, defaults to 10s
   */
  @IsNumber()
  @IsOptional()
  public REQUEST_TIMEOUT =
    this.toOptionalNumber(process.env.REQUEST_TIMEOUT) ?? 10 * 1000;

  /**
   * Base64 encoded private key if Outline is to perform SSL termination.
   */
  @IsOptional()
  @CannotUseWithout("SSL_CERT")
  public SSL_KEY = this.toOptionalString(process.env.SSL_KEY);

  /**
   * Base64 encoded public certificate if Outline is to perform SSL termination.
   */
  @IsOptional()
  @CannotUseWithout("SSL_KEY")
  public SSL_CERT = this.toOptionalString(process.env.SSL_CERT);

  /**
   * Should always be left unset in a self-hosted environment.
   */
  @Equals("hosted")
  @IsOptional()
  public DEPLOYMENT = this.toOptionalString(process.env.DEPLOYMENT);

  /**
   * The default interface language. See translate.getoutline.com for a list of
   * available language codes and their percentage translated.
   */
  @IsIn(languages)
  public DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE ?? "en_US";

  /**
   * A comma separated list of which services should be enabled on this
   * instance – defaults to all.
   *
   * If a services flag is passed it takes priority over the environment variable
   * for example: --services=web,worker
   */
  public SERVICES =
    getArg("services") ??
    process.env.SERVICES ??
    "collaboration,websockets,worker,web";

  /**
   * Auto-redirect to https in production. The default is true but you may set
   * to false if you can be sure that SSL is terminated at an external
   * loadbalancer.
   */
  @IsBoolean()
  public FORCE_HTTPS = this.toBoolean(process.env.FORCE_HTTPS ?? "true");

  /**
   * Whether to support multiple subdomains in a single instance.
   */
  @IsBoolean()
  @Deprecated("The community edition of Outline does not support subdomains")
  public SUBDOMAINS_ENABLED = this.toBoolean(
    process.env.SUBDOMAINS_ENABLED ?? "false"
  );

  /**
   * Should the installation send anonymized statistics to the maintainers.
   * Defaults to true.
   */
  @IsBoolean()
  public TELEMETRY = this.toBoolean(
    process.env.ENABLE_UPDATES ?? process.env.TELEMETRY ?? "true"
  );

  /**
   * An optional comma separated list of allowed domains.
   */
  public ALLOWED_DOMAINS =
    process.env.ALLOWED_DOMAINS ?? process.env.GOOGLE_ALLOWED_DOMAINS;

  // Third-party services

  /**
   * The host of your SMTP server for enabling emails.
   */
  public SMTP_HOST = process.env.SMTP_HOST;

  /**
   * Optional hostname of the client, used for identifying to the server
   * defaults to hostname of the machine.
   */
  public SMTP_NAME = process.env.SMTP_NAME;

  /**
   * The port of your SMTP server.
   */
  @IsNumber()
  @IsOptional()
  public SMTP_PORT = this.toOptionalNumber(process.env.SMTP_PORT);

  /**
   * The username of your SMTP server, if any.
   */
  public SMTP_USERNAME = process.env.SMTP_USERNAME;

  /**
   * The password for the SMTP username, if any.
   */
  public SMTP_PASSWORD = process.env.SMTP_PASSWORD;

  /**
   * The email address from which emails are sent.
   */
  @IsEmail({ allow_display_name: true, allow_ip_domain: true })
  @IsOptional()
  public SMTP_FROM_EMAIL = this.toOptionalString(process.env.SMTP_FROM_EMAIL);

  /**
   * The reply-to address for emails sent from Outline. If unset the from
   * address is used by default.
   */
  @IsEmail({ allow_display_name: true, allow_ip_domain: true })
  @IsOptional()
  public SMTP_REPLY_EMAIL = this.toOptionalString(process.env.SMTP_REPLY_EMAIL);

  /**
   * Override the cipher used for SMTP SSL connections.
   */
  public SMTP_TLS_CIPHERS = this.toOptionalString(process.env.SMTP_TLS_CIPHERS);

  /**
   * If true (the default) the connection will use TLS when connecting to server.
   * If false then TLS is used only if server supports the STARTTLS extension.
   *
   * Setting secure to false therefore does not mean that you would not use an
   * encrypted connection.
   */
  public SMTP_SECURE = this.toBoolean(process.env.SMTP_SECURE ?? "true");

  /**
   * Sentry DSN for capturing errors and frontend performance.
   */
  @IsUrl()
  @IsOptional()
  public SENTRY_DSN = this.toOptionalString(process.env.SENTRY_DSN);

  /**
   * Sentry tunnel URL for bypassing ad blockers
   */
  @IsUrl()
  @IsOptional()
  public SENTRY_TUNNEL = this.toOptionalString(process.env.SENTRY_TUNNEL);

  /**
   * A release SHA or other identifier for Sentry.
   */
  public RELEASE = this.toOptionalString(process.env.RELEASE);

  /**
   * A Google Analytics tracking ID, supports v3 or v4 properties.
   */
  @IsOptional()
  public GOOGLE_ANALYTICS_ID = this.toOptionalString(
    process.env.GOOGLE_ANALYTICS_ID
  );

  /**
   * A DataDog API key for tracking server metrics.
   */
  public DD_API_KEY = process.env.DD_API_KEY;

  /**
   * The name of the service to use in DataDog.
   */
  public DD_SERVICE = process.env.DD_SERVICE ?? "outline";

  /**
   * Google OAuth2 client credentials. To enable authentication with Google.
   */
  @IsOptional()
  @CannotUseWithout("GOOGLE_CLIENT_SECRET")
  public GOOGLE_CLIENT_ID = this.toOptionalString(process.env.GOOGLE_CLIENT_ID);

  @IsOptional()
  @CannotUseWithout("GOOGLE_CLIENT_ID")
  public GOOGLE_CLIENT_SECRET = this.toOptionalString(
    process.env.GOOGLE_CLIENT_SECRET
  );

  /**
   * Slack OAuth2 client credentials. To enable authentication with Slack.
   */
  @IsOptional()
  @Deprecated("Use SLACK_CLIENT_SECRET instead")
  public SLACK_SECRET = this.toOptionalString(process.env.SLACK_SECRET);

  @IsOptional()
  @Deprecated("Use SLACK_CLIENT_ID instead")
  public SLACK_KEY = this.toOptionalString(process.env.SLACK_KEY);

  @IsOptional()
  @CannotUseWithout("SLACK_CLIENT_SECRET")
  public SLACK_CLIENT_ID = this.toOptionalString(
    process.env.SLACK_CLIENT_ID ?? process.env.SLACK_KEY
  );

  @IsOptional()
  @CannotUseWithout("SLACK_CLIENT_ID")
  public SLACK_CLIENT_SECRET = this.toOptionalString(
    process.env.SLACK_CLIENT_SECRET ?? process.env.SLACK_SECRET
  );

  /**
   * This is used to verify webhook requests received from Slack.
   */
  @IsOptional()
  public SLACK_VERIFICATION_TOKEN = this.toOptionalString(
    process.env.SLACK_VERIFICATION_TOKEN
  );

  /**
   * This is injected into the slack-app-id header meta tag if provided.
   */
  @IsOptional()
  @CannotUseWithout("SLACK_CLIENT_ID")
  public SLACK_APP_ID = this.toOptionalString(process.env.SLACK_APP_ID);

  /**
   * If enabled a "Post to Channel" button will be added to search result
   * messages inside of Slack. This also requires setup in Slack UI.
   */
  @IsOptional()
  @IsBoolean()
  public SLACK_MESSAGE_ACTIONS = this.toBoolean(
    process.env.SLACK_MESSAGE_ACTIONS ?? "false"
  );

  /**
   * Azure OAuth2 client credentials. To enable authentication with Azure.
   */
  @IsOptional()
  @CannotUseWithout("AZURE_CLIENT_SECRET")
  public AZURE_CLIENT_ID = this.toOptionalString(process.env.AZURE_CLIENT_ID);

  @IsOptional()
  @CannotUseWithout("AZURE_CLIENT_ID")
  public AZURE_CLIENT_SECRET = this.toOptionalString(
    process.env.AZURE_CLIENT_SECRET
  );

  @IsOptional()
  @CannotUseWithout("AZURE_CLIENT_ID")
  public AZURE_RESOURCE_APP_ID = this.toOptionalString(
    process.env.AZURE_RESOURCE_APP_ID
  );

  /**
   * OICD client credentials. To enable authentication with any
   * compatible provider.
   */
  @IsOptional()
  @CannotUseWithout("OIDC_CLIENT_SECRET")
  @CannotUseWithout("OIDC_AUTH_URI")
  @CannotUseWithout("OIDC_TOKEN_URI")
  @CannotUseWithout("OIDC_USERINFO_URI")
  @CannotUseWithout("OIDC_DISPLAY_NAME")
  public OIDC_CLIENT_ID = this.toOptionalString(process.env.OIDC_CLIENT_ID);

  @IsOptional()
  @CannotUseWithout("OIDC_CLIENT_ID")
  public OIDC_CLIENT_SECRET = this.toOptionalString(
    process.env.OIDC_CLIENT_SECRET
  );

  /**
   * The name of the OIDC provider, eg "GitLab" – this will be displayed on the
   * sign-in button and other places in the UI. The default value is:
   * "OpenID Connect".
   */
  @MaxLength(50)
  public OIDC_DISPLAY_NAME = process.env.OIDC_DISPLAY_NAME ?? "OpenID Connect";

  /**
   * The OIDC authorization endpoint.
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
  })
  public OIDC_AUTH_URI = this.toOptionalString(process.env.OIDC_AUTH_URI);

  /**
   * The OIDC token endpoint.
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
  })
  public OIDC_TOKEN_URI = this.toOptionalString(process.env.OIDC_TOKEN_URI);

  /**
   * The OIDC userinfo endpoint.
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
  })
  public OIDC_USERINFO_URI = this.toOptionalString(
    process.env.OIDC_USERINFO_URI
  );

  /**
   * The OIDC profile field to use as the username. The default value is
   * "preferred_username".
   */
  public OIDC_USERNAME_CLAIM =
    process.env.OIDC_USERNAME_CLAIM ?? "preferred_username";

  /**
   * A space separated list of OIDC scopes to request. Defaults to "openid
   * profile email".
   */
  public OIDC_SCOPES = process.env.OIDC_SCOPES ?? "openid profile email";

  /**
   * A string representing the version of the software.
   *
   * SOURCE_COMMIT is used by Docker Hub
   * SOURCE_VERSION is used by Heroku
   */
  public VERSION = this.toOptionalString(
    process.env.SOURCE_COMMIT || process.env.SOURCE_VERSION
  );

  /**
   * A boolean switch to toggle the rate limiter at application web server.
   */
  @IsOptional()
  @IsBoolean()
  public RATE_LIMITER_ENABLED = this.toBoolean(
    process.env.RATE_LIMITER_ENABLED ?? "false"
  );

  /**
   * Set max allowed requests in a given duration for default rate limiter to
   * trigger throttling, per IP address.
   */
  @IsOptional()
  @IsNumber()
  @CannotUseWithout("RATE_LIMITER_ENABLED")
  public RATE_LIMITER_REQUESTS =
    this.toOptionalNumber(process.env.RATE_LIMITER_REQUESTS) ?? 1000;

  /**
   * Set max allowed realtime connections before throttling. Defaults to 50
   * requests/ip/duration window.
   */
  @IsOptional()
  @IsNumber()
  public RATE_LIMITER_COLLABORATION_REQUESTS =
    this.toOptionalNumber(process.env.RATE_LIMITER_COLLABORATION_REQUESTS) ??
    50;

  /**
   * Set fixed duration window(in secs) for default rate limiter, elapsing which
   * the request quota is reset (the bucket is refilled with tokens).
   */
  @IsOptional()
  @IsNumber()
  @CannotUseWithout("RATE_LIMITER_ENABLED")
  public RATE_LIMITER_DURATION_WINDOW =
    this.toOptionalNumber(process.env.RATE_LIMITER_DURATION_WINDOW) ?? 60;

  /**
   * Set max allowed upload size for file attachments.
   */
  @IsOptional()
  @IsNumber()
  public AWS_S3_UPLOAD_MAX_SIZE =
    this.toOptionalNumber(process.env.AWS_S3_UPLOAD_MAX_SIZE) ?? 100000000;

  /**
   * Set default AWS S3 ACL for file attachments.
   */
  @IsOptional()
  public AWS_S3_ACL = process.env.AWS_S3_ACL ?? "private";

  /**
   * Because imports can be much larger than regular file attachments and are
   * deleted automatically we allow an optional separate limit on the size of
   * imports.
   */
  @IsNumber()
  public MAXIMUM_IMPORT_SIZE = Math.max(
    this.toOptionalNumber(process.env.MAXIMUM_IMPORT_SIZE) ?? 100000000,
    this.AWS_S3_UPLOAD_MAX_SIZE
  );

  /**
   * The product name
   */
  public APP_NAME = "Outline";

  /**
   * Returns true if the current installation is the cloud hosted version at
   * getoutline.com
   */
  public isCloudHosted() {
    return this.DEPLOYMENT === "hosted";
  }

  private toOptionalString(value: string | undefined) {
    return value ? value : undefined;
  }

  private toOptionalNumber(value: string | undefined) {
    return value ? parseInt(value, 10) : undefined;
  }

  /**
   * Convert a string to a boolean. Supports the following:
   *
   * 0 = false
   * 1 = true
   * "true" = true
   * "false" = false
   * "" = false
   *
   * @param value The string to convert
   * @returns A boolean
   */
  private toBoolean(value: string) {
    return value ? !!JSON.parse(value) : false;
  }
}

const env = new Environment();

export default env;
