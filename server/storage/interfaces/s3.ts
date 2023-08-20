import util from "util";
import AWS, { S3 } from "aws-sdk";
import fetch from "fetch-with-proxy";
import invariant from "invariant";
import compact from "lodash/compact";
import { useAgent } from "request-filtering-agent";
import { v4 as uuidv4 } from "uuid";
import env from "@server/env";
import Logger from "@server/logging/Logger";

const s3 = new AWS.S3({
  s3BucketEndpoint: env.AWS_S3_ACCELERATE_URL ? true : undefined,
  s3ForcePathStyle: env.AWS_S3_FORCE_PATH_STYLE,
  accessKeyId: env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  region: env.AWS_REGION,
  endpoint: env.AWS_S3_ACCELERATE_URL
    ? env.AWS_S3_ACCELERATE_URL
    : env.AWS_S3_UPLOAD_BUCKET_NAME &&
      env.AWS_S3_UPLOAD_BUCKET_URL.includes(env.AWS_S3_UPLOAD_BUCKET_NAME)
    ? undefined
    : new AWS.Endpoint(env.AWS_S3_UPLOAD_BUCKET_URL),
  signatureVersion: "v4",
});

const createPresignedPost: (
  params: S3.PresignedPost.Params
) => Promise<S3.PresignedPost> = util
  .promisify(s3.createPresignedPost)
  .bind(s3);

export const getPresignedPost = (
  key: string,
  acl: string,
  maxUploadSize: number,
  contentType = "image"
) => {
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

  return createPresignedPost(params);
};

export const publicS3Endpoint = (isServerUpload?: boolean) => {
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
};

export const uploadToS3 = async ({
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

  await s3
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
  const endpoint = publicS3Endpoint(true);
  return `${endpoint}/${key}`;
};

export const uploadToS3FromUrl = async (
  url: string,
  key: string,
  acl: string
) => {
  invariant(
    env.AWS_S3_UPLOAD_BUCKET_NAME,
    "AWS_S3_UPLOAD_BUCKET_NAME is required"
  );

  const endpoint = publicS3Endpoint(true);
  if (url.startsWith("/api") || url.startsWith(endpoint)) {
    return;
  }

  try {
    const res = await fetch(url, {
      agent: useAgent(url),
    });
    const buffer = await res.buffer();
    await s3
      .putObject({
        ACL: acl,
        Bucket: env.AWS_S3_UPLOAD_BUCKET_NAME,
        Key: key,
        ContentType: res.headers["content-type"],
        ContentLength: res.headers["content-length"],
        ContentDisposition: "attachment",
        Body: buffer,
      })
      .promise();
    return `${endpoint}/${key}`;
  } catch (err) {
    Logger.error("Error uploading to S3 from URL", err, {
      url,
      key,
      acl,
    });
    return;
  }
};

export const deleteFromS3 = (key: string) => {
  invariant(
    env.AWS_S3_UPLOAD_BUCKET_NAME,
    "AWS_S3_UPLOAD_BUCKET_NAME is required"
  );

  return s3
    .deleteObject({
      Bucket: env.AWS_S3_UPLOAD_BUCKET_NAME,
      Key: key,
    })
    .promise();
};

export const getSignedUrl = async (key: string, expiresIn = 60) => {
  const isDocker = env.AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);
  const params = {
    Bucket: env.AWS_S3_UPLOAD_BUCKET_NAME,
    Key: key,
    Expires: expiresIn,
    ResponseContentDisposition: "attachment",
  };

  const url = isDocker
    ? `${publicS3Endpoint()}/${key}`
    : await s3.getSignedUrlPromise("getObject", params);

  if (env.AWS_S3_ACCELERATE_URL) {
    return url.replace(env.AWS_S3_UPLOAD_BUCKET_URL, env.AWS_S3_ACCELERATE_URL);
  }

  return url;
};

// function assumes that acl is private
export const getAWSKeyForFileOp = (teamId: string, name: string) => {
  const bucket = "uploads";
  return `${bucket}/${teamId}/${uuidv4()}/${name}-export.zip`;
};

export const getFileStream = (key: string) => {
  invariant(
    env.AWS_S3_UPLOAD_BUCKET_NAME,
    "AWS_S3_UPLOAD_BUCKET_NAME is required"
  );

  try {
    return s3
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
};

export const getFileBuffer = async (key: string) => {
  invariant(
    env.AWS_S3_UPLOAD_BUCKET_NAME,
    "AWS_S3_UPLOAD_BUCKET_NAME is required"
  );

  const response = await s3
    .getObject({
      Bucket: env.AWS_S3_UPLOAD_BUCKET_NAME,
      Key: key,
    })
    .promise();

  if (response.Body) {
    return response.Body as Blob;
  }

  throw new Error("Error getting file buffer from S3");
};
