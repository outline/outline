/* eslint-disable no-console */
// eslint-disable-next-line import/order
import environment from "./utils/environment";
import os from "os";
import {
  validate,
  IsNotEmpty,
  IsUrl,
  IsOptional,
  IsByteLength,
  IsNumber,
  IsIn,
  IsEmail,
  IsBoolean,
} from "class-validator";
import uniq from "lodash/uniq";
import { languages } from "@shared/i18n";
import { CannotUseWithout } from "@server/utils/validators";
import Deprecated from "./models/decorators/Deprecated";
import { getArg } from "./utils/args";
import { Public, PublicEnvironmentRegister } from "./utils/decorators/Public";

export class Environment {
  constructor() {
    process.nextTick(() => {
      void validate(this).then((errors) => {
        if (errors.length > 0) {
          let output =
            "Environment configuration is invalid, please check the following:\n\n";
          output += errors.map(
            (error) => "- " + Object.values(error.constraints ?? {}).join(", ")
          );
          console.warn(output);
          process.exit(1);
        }
      });
    });

    PublicEnvironmentRegister.registerEnv(this);
  }

  /**
   * Returns an object consisting of env vars annotated with `@Public` decorator
   */
  get public() {
    return PublicEnvironmentRegister.getEnv();
  }

  /**
   * The current environment name.
   */
  @Public
  @IsIn(["development", "production", "staging", "test"])
  public ENVIRONMENT = environment.NODE_ENV ?? "production";

  /**
   * The secret key is used for encrypting data. Do not change this value once
   * set or your users will be unable to login.
   */
  @IsByteLength(32, 64, {
    message: `The SECRET_KEY environment variable is invalid (Use \`openssl rand -hex 32\` to generate a value).`,
  })
  public SECRET_KEY = environment.SECRET_KEY ?? "";

  /**
   * The secret that should be passed to the cron utility endpoint to enable
   * triggering of scheduled tasks.
   */
  @IsNotEmpty()
  public UTILS_SECRET = environment.UTILS_SECRET ?? "";

  /**
   * The url of the database.
   */
  @IsNotEmpty()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
    protocols: ["postgres", "postgresql"],
  })
  public DATABASE_URL = environment.DATABASE_URL ?? "";

  /**
   * An optional database schema.
   */
  @IsOptional()
  public DATABASE_SCHEMA = this.toOptionalString(environment.DATABASE_SCHEMA);

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
    environment.DATABASE_CONNECTION_POOL_URL
  );

  /**
   * Database connection pool configuration.
   */
  @IsNumber()
  @IsOptional()
  public DATABASE_CONNECTION_POOL_MIN = this.toOptionalNumber(
    environment.DATABASE_CONNECTION_POOL_MIN
  );

  /**
   * Database connection pool configuration.
   */
  @IsNumber()
  @IsOptional()
  public DATABASE_CONNECTION_POOL_MAX = this.toOptionalNumber(
    environment.DATABASE_CONNECTION_POOL_MAX
  );

  /**
   * Set to "disable" to disable SSL connection to the database. This option is
   * passed through to Postgres. See:
   *
   * https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNECT-SSLMODE
   */
  @IsIn(["disable", "allow", "require", "prefer", "verify-ca", "verify-full"])
  @IsOptional()
  public PGSSLMODE = environment.PGSSLMODE;

  /**
   * The url of redis. Note that redis does not have a database after the port.
   * Note: More extensive validation isn't included here due to our support for
   * base64-encoded configuration.
   */
  @IsNotEmpty()
  public REDIS_URL = environment.REDIS_URL;

  /**
   * The fully qualified, external facing domain name of the server.
   */
  @Public
  @IsNotEmpty()
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
    require_tld: false,
  })
  public URL = (environment.URL ?? "").replace(/\/$/, "");

  /**
   * If using a Cloudfront/Cloudflare distribution or similar it can be set below.
   * This will cause paths to javascript, stylesheets, and images to be updated to
   * the hostname defined in CDN_URL. In your CDN configuration the origin server
   * should be set to the same as URL.
   */
  @Public
  @IsOptional()
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
    require_tld: false,
  })
  public CDN_URL = this.toOptionalString(
    environment.CDN_URL ? environment.CDN_URL.replace(/\/$/, "") : undefined
  );

  /**
   * The fully qualified, external facing domain name of the collaboration
   * service, if different (unlikely)
   */
  @Public
  @IsUrl({
    require_tld: false,
    require_protocol: true,
    protocols: ["http", "https", "ws", "wss"],
  })
  @IsOptional()
  public COLLABORATION_URL = (environment.COLLABORATION_URL || this.URL)
    .replace(/\/$/, "")
    .replace(/^http/, "ws");

  /**
   * The maximum number of network clients that can be connected to a single
   * document at once. Defaults to 100.
   */
  @IsOptional()
  @IsNumber()
  public COLLABORATION_MAX_CLIENTS_PER_DOCUMENT = parseInt(
    environment.COLLABORATION_MAX_CLIENTS_PER_DOCUMENT || "100",
    10
  );

  /**
   * The port that the server will listen on, defaults to 3000.
   */
  @IsNumber()
  @IsOptional()
  public PORT = this.toOptionalNumber(environment.PORT) ?? 3000;

  /**
   * Optional extra debugging. Comma separated
   */
  public DEBUG = environment.DEBUG || "";

  /**
   * Configure lowest severity level for server logs
   */
  @IsIn(["error", "warn", "info", "http", "verbose", "debug", "silly"])
  public LOG_LEVEL = environment.LOG_LEVEL || "info";

  /**
   * How many processes should be spawned. As a reasonable rule divide your
   * server's available memory by 512 for a rough estimate
   */
  @IsNumber()
  @IsOptional()
  public WEB_CONCURRENCY = this.toOptionalNumber(environment.WEB_CONCURRENCY);

  /**
   * How long a request should be processed before giving up and returning an
   * error response to the client, defaults to 10s
   */
  @IsNumber()
  @IsOptional()
  public REQUEST_TIMEOUT =
    this.toOptionalNumber(environment.REQUEST_TIMEOUT) ?? 10 * 1000;

  /**
   * Base64 encoded protected key if Outline is to perform SSL termination.
   */
  @IsOptional()
  @CannotUseWithout("SSL_CERT")
  public SSL_KEY = this.toOptionalString(environment.SSL_KEY);

  /**
   * Base64 encoded public certificate if Outline is to perform SSL termination.
   */
  @IsOptional()
  @CannotUseWithout("SSL_KEY")
  public SSL_CERT = this.toOptionalString(environment.SSL_CERT);

  /**
   * The default interface language. See translate.getoutline.com for a list of
   * available language codes and their percentage translated.
   */
  @Public
  @IsIn(languages)
  public DEFAULT_LANGUAGE = environment.DEFAULT_LANGUAGE ?? "en_US";

  /**
   * A comma list of which services should be enabled on this instance – defaults to all.
   *
   * If a services flag is passed it takes priority over the environment variable
   * for example: --services=web,worker
   */
  public SERVICES = uniq(
    (
      getArg("services") ??
      environment.SERVICES ??
      "collaboration,websockets,worker,web"
    )
      .split(",")
      .map((service) => service.toLowerCase().trim())
  );

  /**
   * Auto-redirect to https in production. The default is true but you may set
   * to false if you can be sure that SSL is terminated at an external
   * loadbalancer.
   */
  @IsBoolean()
  public FORCE_HTTPS = this.toBoolean(environment.FORCE_HTTPS ?? "true");

  /**
   * Should the installation send anonymized statistics to the maintainers.
   * Defaults to true.
   */
  @IsBoolean()
  public TELEMETRY = this.toBoolean(
    environment.ENABLE_UPDATES ?? environment.TELEMETRY ?? "true"
  );

  /**
   * An optional comma separated list of allowed domains.
   */
  public ALLOWED_DOMAINS =
    environment.ALLOWED_DOMAINS ?? environment.GOOGLE_ALLOWED_DOMAINS;

  // Third-party services

  /**
   * The host of your SMTP server for enabling emails.
   */
  public SMTP_HOST = environment.SMTP_HOST;

  @Public
  public EMAIL_ENABLED = !!this.SMTP_HOST || this.isDevelopment;

  /**
   * Optional hostname of the client, used for identifying to the server
   * defaults to hostname of the machine.
   */
  public SMTP_NAME = environment.SMTP_NAME;

  /**
   * The port of your SMTP server.
   */
  @IsNumber()
  @IsOptional()
  public SMTP_PORT = this.toOptionalNumber(environment.SMTP_PORT);

  /**
   * The username of your SMTP server, if any.
   */
  public SMTP_USERNAME = environment.SMTP_USERNAME;

  /**
   * The password for the SMTP username, if any.
   */
  public SMTP_PASSWORD = environment.SMTP_PASSWORD;

  /**
   * The email address from which emails are sent.
   */
  @IsEmail({ allow_display_name: true, allow_ip_domain: true })
  @IsOptional()
  public SMTP_FROM_EMAIL = this.toOptionalString(environment.SMTP_FROM_EMAIL);

  /**
   * The reply-to address for emails sent from Outline. If unset the from
   * address is used by default.
   */
  @IsEmail({ allow_display_name: true, allow_ip_domain: true })
  @IsOptional()
  public SMTP_REPLY_EMAIL = this.toOptionalString(environment.SMTP_REPLY_EMAIL);

  /**
   * Override the cipher used for SMTP SSL connections.
   */
  public SMTP_TLS_CIPHERS = this.toOptionalString(environment.SMTP_TLS_CIPHERS);

  /**
   * If true (the default) the connection will use TLS when connecting to server.
   * If false then TLS is used only if server supports the STARTTLS extension.
   *
   * Setting secure to false therefore does not mean that you would not use an
   * encrypted connection.
   */
  public SMTP_SECURE = this.toBoolean(environment.SMTP_SECURE ?? "true");

  /**
   * Dropbox app key for embedding Dropbox files
   */
  @Public
  @IsOptional()
  public DROPBOX_APP_KEY = this.toOptionalString(environment.DROPBOX_APP_KEY);

  /**
   * Sentry DSN for capturing errors and frontend performance.
   */
  @Public
  @IsUrl()
  @IsOptional()
  public SENTRY_DSN = this.toOptionalString(environment.SENTRY_DSN);

  /**
   * Sentry tunnel URL for bypassing ad blockers
   */
  @Public
  @IsUrl()
  @IsOptional()
  public SENTRY_TUNNEL = this.toOptionalString(environment.SENTRY_TUNNEL);

  /**
   * A release SHA or other identifier for Sentry.
   */
  public RELEASE = this.toOptionalString(environment.RELEASE);

  /**
   * A Google Analytics tracking ID, supports v3 or v4 properties.
   */
  @Public
  @IsOptional()
  public GOOGLE_ANALYTICS_ID = this.toOptionalString(
    environment.GOOGLE_ANALYTICS_ID
  );

  /**
   * A DataDog API key for tracking server metrics.
   */
  public DD_API_KEY = environment.DD_API_KEY;

  /**
   * The name of the service to use in DataDog.
   */
  public DD_SERVICE = environment.DD_SERVICE ?? "outline";

  /**
   * A string representing the version of the software.
   *
   * SOURCE_COMMIT is used by Docker Hub
   * SOURCE_VERSION is used by Heroku
   */
  @Public
  public VERSION = this.toOptionalString(
    environment.SOURCE_COMMIT || environment.SOURCE_VERSION
  );

  /**
   * The maximum number of concurrent events processed per-worker. To get total
   * concurrency you should multiply this by the number of workers.
   */
  @IsOptional()
  @IsNumber()
  public WORKER_CONCURRENCY_EVENTS =
    this.toOptionalNumber(environment.WORKER_CONCURRENCY_EVENTS) ?? 10;

  /**
   * The maximum number of concurrent tasks processed per-worker. To get total
   * concurrency you should multiply this by the number of workers.
   */
  @IsOptional()
  @IsNumber()
  public WORKER_CONCURRENCY_TASKS =
    this.toOptionalNumber(environment.WORKER_CONCURRENCY_TASKS) ?? 10;

  /**
   * A boolean switch to toggle the rate limiter at application web server.
   */
  @IsOptional()
  @IsBoolean()
  public RATE_LIMITER_ENABLED = this.toBoolean(
    environment.RATE_LIMITER_ENABLED ?? "false"
  );

  /**
   * Set max allowed requests in a given duration for default rate limiter to
   * trigger throttling, per IP address.
   */
  @IsOptional()
  @IsNumber()
  @CannotUseWithout("RATE_LIMITER_ENABLED")
  public RATE_LIMITER_REQUESTS =
    this.toOptionalNumber(environment.RATE_LIMITER_REQUESTS) ?? 1000;

  /**
   * Set max allowed realtime connections before throttling. Defaults to 50
   * requests/ip/duration window.
   */
  @IsOptional()
  @IsNumber()
  public RATE_LIMITER_COLLABORATION_REQUESTS =
    this.toOptionalNumber(environment.RATE_LIMITER_COLLABORATION_REQUESTS) ??
    50;

  /**
   * Set fixed duration window(in secs) for default rate limiter, elapsing which
   * the request quota is reset (the bucket is refilled with tokens).
   */
  @IsOptional()
  @IsNumber()
  @CannotUseWithout("RATE_LIMITER_ENABLED")
  public RATE_LIMITER_DURATION_WINDOW =
    this.toOptionalNumber(environment.RATE_LIMITER_DURATION_WINDOW) ?? 60;

  /**
   * Set max allowed upload size for file attachments.
   * @deprecated Use FILE_STORAGE_UPLOAD_MAX_SIZE instead
   */
  @IsOptional()
  @IsNumber()
  @Deprecated("Use FILE_STORAGE_UPLOAD_MAX_SIZE instead")
  public AWS_S3_UPLOAD_MAX_SIZE = this.toOptionalNumber(
    environment.AWS_S3_UPLOAD_MAX_SIZE
  );

  /**
   * Access key ID for AWS S3.
   */
  @IsOptional()
  public AWS_ACCESS_KEY_ID = this.toOptionalString(
    environment.AWS_ACCESS_KEY_ID
  );

  /**
   * Secret key for AWS S3.
   */
  @IsOptional()
  @CannotUseWithout("AWS_ACCESS_KEY_ID")
  public AWS_SECRET_ACCESS_KEY = this.toOptionalString(
    environment.AWS_SECRET_ACCESS_KEY
  );

  /**
   * The name of the AWS S3 region to use.
   */
  @IsOptional()
  public AWS_REGION = this.toOptionalString(environment.AWS_REGION);

  /**
   * Optional AWS S3 endpoint URL for file attachments.
   */
  @Public
  @IsOptional()
  public AWS_S3_ACCELERATE_URL = environment.AWS_S3_ACCELERATE_URL ?? "";

  /**
   * Optional AWS S3 endpoint URL for file attachments.
   */
  @Public
  @IsOptional()
  public AWS_S3_UPLOAD_BUCKET_URL = environment.AWS_S3_UPLOAD_BUCKET_URL ?? "";

  /**
   * The bucket name to store file attachments in.
   */
  @IsOptional()
  public AWS_S3_UPLOAD_BUCKET_NAME = this.toOptionalString(
    environment.AWS_S3_UPLOAD_BUCKET_NAME
  );

  /**
   * Whether to force path style URLs for S3 objects, this is required for some
   * S3-compatible storage providers.
   */
  @IsOptional()
  public AWS_S3_FORCE_PATH_STYLE = this.toBoolean(
    environment.AWS_S3_FORCE_PATH_STYLE ?? "true"
  );

  /**
   * Set default AWS S3 ACL for file attachments.
   */
  @IsOptional()
  public AWS_S3_ACL = environment.AWS_S3_ACL ?? "private";

  /**
   * Which file storage system to use
   */
  @IsIn(["local", "s3"])
  public FILE_STORAGE = this.toOptionalString(environment.FILE_STORAGE) ?? "s3";

  /**
   * Set default root dir path for local file storage
   */
  public FILE_STORAGE_LOCAL_ROOT_DIR =
    this.toOptionalString(environment.FILE_STORAGE_LOCAL_ROOT_DIR) ??
    "/var/lib/outline/data";

  /**
   * Set max allowed upload size for file attachments.
   */
  @IsNumber()
  public FILE_STORAGE_UPLOAD_MAX_SIZE =
    this.toOptionalNumber(environment.FILE_STORAGE_UPLOAD_MAX_SIZE) ??
    this.toOptionalNumber(environment.AWS_S3_UPLOAD_MAX_SIZE) ??
    1000000;

  /**
   * Set max allowed upload size for document imports.
   */
  @Public
  @IsNumber()
  public FILE_STORAGE_IMPORT_MAX_SIZE =
    this.toOptionalNumber(environment.FILE_STORAGE_IMPORT_MAX_SIZE) ??
    this.toOptionalNumber(environment.MAXIMUM_IMPORT_SIZE) ??
    this.toOptionalNumber(environment.FILE_STORAGE_UPLOAD_MAX_SIZE) ??
    1000000;

  /**
   * Set max allowed upload size for imports at workspace level.
   */
  @IsNumber()
  public FILE_STORAGE_WORKSPACE_IMPORT_MAX_SIZE =
    this.toOptionalNumber(environment.FILE_STORAGE_WORKSPACE_IMPORT_MAX_SIZE) ??
    this.toOptionalNumber(environment.MAXIMUM_IMPORT_SIZE) ??
    this.toOptionalNumber(environment.FILE_STORAGE_UPLOAD_MAX_SIZE) ??
    1000000;

  /**
   * Because imports can be much larger than regular file attachments and are
   * deleted automatically we allow an optional separate limit on the size of
   * imports.
   *
   * @deprecated Use `FILE_STORAGE_IMPORT_MAX_SIZE` or `FILE_STORAGE_WORKSPACE_IMPORT_MAX_SIZE` instead
   */
  @IsOptional()
  @IsNumber()
  @Deprecated("Use FILE_STORAGE_IMPORT_MAX_SIZE instead")
  public MAXIMUM_IMPORT_SIZE = this.toOptionalNumber(
    environment.MAXIMUM_IMPORT_SIZE
  );

  /**
   * Limit on export size in bytes. Defaults to the total memory available to
   * the container.
   */
  @IsNumber()
  public MAXIMUM_EXPORT_SIZE =
    this.toOptionalNumber(environment.MAXIMUM_EXPORT_SIZE) ?? os.totalmem();

  /**
   * Enable unsafe-inline in script-src CSP directive
   */
  @IsBoolean()
  public DEVELOPMENT_UNSAFE_INLINE_CSP = this.toBoolean(
    environment.DEVELOPMENT_UNSAFE_INLINE_CSP ?? "false"
  );

  /**
   * The product name
   */
  @Public
  public APP_NAME = "Outline";

  /**
   * Returns true if the current installation is the cloud hosted version at
   * getoutline.com
   */
  public get isCloudHosted() {
    return [
      "https://app.getoutline.com",
      "https://app.outline.dev",
      "https://app.outline.dev:3000",
    ].includes(this.URL);
  }

  /**
   * Returns true if the current installation is running in production.
   */
  public get isProduction() {
    return this.ENVIRONMENT === "production";
  }

  /**
   * Returns true if the current installation is running in the development environment.
   */
  public get isDevelopment() {
    return this.ENVIRONMENT === "development";
  }

  /**
   * Returns true if the current installation is running in a test environment.
   */
  public get isTest() {
    return this.ENVIRONMENT === "test";
  }

  protected toOptionalString(value: string | undefined) {
    return value ? value : undefined;
  }

  protected toOptionalCommaList(value: string | undefined) {
    return value ? value.split(",").map((item) => item.trim()) : undefined;
  }

  protected toOptionalNumber(value: string | undefined) {
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
  protected toBoolean(value: string) {
    try {
      return value ? !!JSON.parse(value) : false;
    } catch (err) {
      throw new Error(
        `"${value}" could not be parsed as a boolean, must be "true" or "false"`
      );
    }
  }

  /**
   * Convert a string to an optional boolean. Supports the following:
   *
   * 0 = false
   * 1 = true
   * "true" = true
   * "false" = false
   * "" = undefined
   *
   * @param value The string to convert
   * @returns A boolean or undefined
   */
  protected toOptionalBoolean(value: string | undefined) {
    try {
      return value ? !!JSON.parse(value) : undefined;
    } catch (err) {
      return undefined;
    }
  }
}

export default new Environment();
