import Koa from "koa";
import env from "@server/env";
import TestServer from "@server/test/TestServer";
import createCSPMiddleware from "./csp";

const originalEnv = {
  AWS_S3_ACCELERATE_URL: env.AWS_S3_ACCELERATE_URL,
  AWS_S3_UPLOAD_BUCKET_URL: env.AWS_S3_UPLOAD_BUCKET_URL,
  AWS_S3_UPLOAD_BUCKET_NAME: env.AWS_S3_UPLOAD_BUCKET_NAME,
  AWS_S3_FORCE_PATH_STYLE: env.AWS_S3_FORCE_PATH_STYLE,
};

async function getObjectSrc() {
  const app = new Koa();
  app.use(createCSPMiddleware());
  app.use((ctx) => {
    ctx.body = "ok";
  });

  const server = new TestServer(app);
  try {
    const res = await server.get("/");
    const csp = res.headers.get("content-security-policy") ?? "";
    const directive = csp
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("object-src "));
    return directive?.split(" ").slice(1) ?? [];
  } finally {
    server.close();
  }
}

describe("csp middleware", () => {
  beforeEach(() => {
    env.AWS_S3_ACCELERATE_URL = "";
    env.AWS_S3_UPLOAD_BUCKET_NAME = "my-bucket";
  });

  afterEach(() => {
    Object.assign(env, originalEnv);
  });

  it("should allow the path-style bucket origin", async () => {
    env.AWS_S3_UPLOAD_BUCKET_URL = "https://s3.eu-central-1.amazonaws.com";
    env.AWS_S3_FORCE_PATH_STYLE = true;

    const objectSrc = await getObjectSrc();
    expect(objectSrc).toContain("https://s3.eu-central-1.amazonaws.com");
    expect(objectSrc).not.toContain(
      "https://my-bucket.s3.eu-central-1.amazonaws.com"
    );
  });

  it("should allow the virtual-host bucket origin without path-style", async () => {
    env.AWS_S3_UPLOAD_BUCKET_URL = "https://s3.eu-central-1.amazonaws.com";
    env.AWS_S3_FORCE_PATH_STYLE = false;

    const objectSrc = await getObjectSrc();
    expect(objectSrc).toContain("https://s3.eu-central-1.amazonaws.com");
    expect(objectSrc).toContain(
      "https://my-bucket.s3.eu-central-1.amazonaws.com"
    );
  });

  it("should allow the virtual-host bucket origin when the url includes the bucket", async () => {
    env.AWS_S3_UPLOAD_BUCKET_URL =
      "https://my-bucket.s3.eu-central-1.amazonaws.com";
    env.AWS_S3_FORCE_PATH_STYLE = false;

    const objectSrc = await getObjectSrc();
    expect(objectSrc).toContain("https://s3.eu-central-1.amazonaws.com");
    expect(objectSrc).toContain(
      "https://my-bucket.s3.eu-central-1.amazonaws.com"
    );
  });

  it("should keep the port of the bucket url", async () => {
    env.AWS_S3_UPLOAD_BUCKET_URL = "http://minio.local:9000";
    env.AWS_S3_FORCE_PATH_STYLE = false;

    const objectSrc = await getObjectSrc();
    expect(objectSrc).toContain("http://minio.local:9000");
    expect(objectSrc).toContain("http://my-bucket.minio.local:9000");
  });

  it("should only allow the accelerate origin when configured", async () => {
    env.AWS_S3_ACCELERATE_URL = "https://my-bucket.s3-accelerate.amazonaws.com";
    env.AWS_S3_UPLOAD_BUCKET_URL = "https://s3.eu-central-1.amazonaws.com";
    env.AWS_S3_FORCE_PATH_STYLE = false;

    const objectSrc = await getObjectSrc();
    expect(objectSrc).toContain(
      "https://my-bucket.s3-accelerate.amazonaws.com"
    );
    expect(objectSrc).not.toContain("https://s3.eu-central-1.amazonaws.com");
  });
});
