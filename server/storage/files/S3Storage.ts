import util from "util";
import AWS, { S3 } from "aws-sdk";
import invariant from "invariant";
import compact from "lodash/compact";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import BaseStorage from "./BaseStorage";

export default class S3Storage extends BaseStorage {
  constructor() {
    super();

    this.client = new AWS.S3({
      s3BucketEndpoint: env.AWS_S3_ACCELERATE_URL ? true : undefined,
      s3ForcePathStyle: env.AWS_S3_FORCE_PATH_STYLE,
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.AWS_REGION,
      endpoint: this.getEndpoint(),
      signatureVersion: "v4",
    });
  }

  public async getPresignedPost(
    key: string,
    acl: string,
    maxUploadSize: number,
    contentType = "image"
  ) {
    const params = {
      Bucket: env.AWS_S3_UPLOAD_BUCKET_NAME,
      Conditions: compact([
        ["content-length-range", 0, maxUploadSize],
        ["starts-with", "$Content-Type", contentType],
        ["starts-with", "$Cache-Control", ""],
      ]),
      Fields: {
        "Content-Disposition": "attachment",
        key,
        acl,
      },
      Expires: 3600,
    };

    return util.promisify(this.client.createPresignedPost).bind(this.client)(
      params
    );
  }

  public getPublicEndpoint(isServerUpload?: boolean) {
    if (env.AWS_S3_ACCELERATE_URL) {
      return env.AWS_S3_ACCELERATE_URL;
    }
    invariant(
      env.AWS_S3_UPLOAD_BUCKET_NAME,
      "AWS_S3_UPLOAD_BUCKET_NAME is required"
    );

    // lose trailing slash if there is one and convert fake-s3 url to localhost
    // for access outside of docker containers in local development
    const isDocker = env.AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);

    const host = env.AWS_S3_UPLOAD_BUCKET_URL.replace(
      "s3:",
      "localhost:"
    ).replace(/\/$/, "");

    // support old path-style S3 uploads and new virtual host uploads by checking
    // for the bucket name in the endpoint url before appending.
    const isVirtualHost = host.includes(env.AWS_S3_UPLOAD_BUCKET_NAME);

    if (isVirtualHost) {
      return host;
    }

    return `${host}/${isServerUpload && isDocker ? "s3/" : ""}${
      env.AWS_S3_UPLOAD_BUCKET_NAME
    }`;
  }

  public upload = async ({
    body,
    contentLength,
    contentType,
    key,
    acl,
  }: {
    body: S3.Body;
    contentLength: number;
    contentType: string;
    key: string;
    acl: string;
  }) => {
    invariant(
      env.AWS_S3_UPLOAD_BUCKET_NAME,
      "AWS_S3_UPLOAD_BUCKET_NAME is required"
    );

    await this.client
      .putObject({
        ACL: acl,
        Bucket: env.AWS_S3_UPLOAD_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        ContentLength: contentLength,
        ContentDisposition: "attachment",
        Body: body,
      })
      .promise();
    const endpoint = this.getPublicEndpoint(true);
    return `${endpoint}/${key}`;
  };

  public async deleteFile(key: string) {
    invariant(
      env.AWS_S3_UPLOAD_BUCKET_NAME,
      "AWS_S3_UPLOAD_BUCKET_NAME is required"
    );

    await this.client
      .deleteObject({
        Bucket: env.AWS_S3_UPLOAD_BUCKET_NAME,
        Key: key,
      })
      .promise();
  }

  public getSignedUrl = async (key: string, expiresIn = 60) => {
    const isDocker = env.AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);
    const params = {
      Bucket: env.AWS_S3_UPLOAD_BUCKET_NAME,
      Key: key,
      Expires: expiresIn,
      ResponseContentDisposition: "attachment",
    };

    const url = isDocker
      ? `${this.getPublicEndpoint()}/${key}`
      : await this.client.getSignedUrlPromise("getObject", params);

    if (env.AWS_S3_ACCELERATE_URL) {
      return url.replace(
        env.AWS_S3_UPLOAD_BUCKET_URL,
        env.AWS_S3_ACCELERATE_URL
      );
    }

    return url;
  };

  public getFileStream(key: string) {
    invariant(
      env.AWS_S3_UPLOAD_BUCKET_NAME,
      "AWS_S3_UPLOAD_BUCKET_NAME is required"
    );

    try {
      return this.client
        .getObject({
          Bucket: env.AWS_S3_UPLOAD_BUCKET_NAME,
          Key: key,
        })
        .createReadStream();
    } catch (err) {
      Logger.error("Error getting file stream from S3 ", err, {
        key,
      });
    }

    return null;
  }

  public async getFileBuffer(key: string) {
    invariant(
      env.AWS_S3_UPLOAD_BUCKET_NAME,
      "AWS_S3_UPLOAD_BUCKET_NAME is required"
    );

    const response = await this.client
      .getObject({
        Bucket: env.AWS_S3_UPLOAD_BUCKET_NAME,
        Key: key,
      })
      .promise();

    if (response.Body) {
      return response.Body as Blob;
    }

    throw new Error("Error getting file buffer from S3");
  }

  private client: AWS.S3;

  private getEndpoint() {
    if (env.AWS_S3_ACCELERATE_URL) {
      return env.AWS_S3_ACCELERATE_URL;
    }

    // support old path-style S3 uploads and new virtual host uploads by
    // checking for the bucket name in the endpoint url.
    if (
      env.AWS_S3_UPLOAD_BUCKET_NAME &&
      env.AWS_S3_FORCE_PATH_STYLE === false
    ) {
      const url = new URL(env.AWS_S3_UPLOAD_BUCKET_URL);
      if (url.hostname.startsWith(env.AWS_S3_UPLOAD_BUCKET_NAME + ".")) {
        return undefined;
      }
    }

    return new AWS.Endpoint(env.AWS_S3_UPLOAD_BUCKET_URL);
  }
}
