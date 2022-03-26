import util from "util";
import AWS from "aws-sdk";
import fetch from "fetch-with-proxy";
import { v4 as uuidv4 } from "uuid";
import Logger from "@server/logging/logger";

const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_REGION = process.env.AWS_REGION || "";
const AWS_SERVICE = process.env.AWS_SERVICE || "s3";
const AWS_S3_PROVIDER = process.env.AWS_S3_PROVIDER || "amazonaws.com";
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "outline";
const AWS_S3_ENDPOINT =
  process.env.AWS_S3_ENDPOINT ||
  `https://${AWS_SERVICE}.${AWS_REGION}.${AWS_S3_PROVIDER}`;
const AWS_S3_ENDPOINT_STYLE = process.env.AWS_S3_ENDPOINT_STYLE || "domain";
const AWS_S3_PUBLIC_ENDPOINT =
  process.env.AWS_S3_PUBLIC_ENDPOINT || AWS_S3_ENDPOINT;

const s3config = {
  endpoint: "",
  region: AWS_REGION,
  s3ForcePathStyle: AWS_S3_ENDPOINT_STYLE === "path",
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  signatureVersion: "v4",
};

s3config.endpoint = AWS_S3_ENDPOINT;
const s3 = new AWS.S3(s3config);
s3config.endpoint = AWS_S3_PUBLIC_ENDPOINT;
const s3public = new AWS.S3(s3config); // used only for signing public urls

const getPresignedPostPromise = util
  .promisify(s3public.createPresignedPost)
  .bind(s3public);
const getSignedUrlPromise = s3public.getSignedUrlPromise;

export const getPresignedPost = async (
  key: string,
  acl: string,
  contentType = "image"
) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Conditions: [
      process.env.AWS_S3_UPLOAD_MAX_SIZE
        ? ["content-length-range", 0, +process.env.AWS_S3_UPLOAD_MAX_SIZE]
        : undefined,
      ["starts-with", "$Content-Type", contentType],
      ["starts-with", "$Cache-Control", ""],
    ].filter(Boolean),
    Fields: {
      key,
      acl,
    },
    Expires: 3600,
  };

  return await getPresignedPostPromise(params);
};

const _publicS3Endpoint = (() => {
  const url = new URL(AWS_S3_PUBLIC_ENDPOINT);
  if (AWS_S3_ENDPOINT_STYLE === "domain") {
    url.host = `${AWS_S3_BUCKET_NAME}.${url.host}`;
  } else {
    url.pathname += AWS_S3_BUCKET_NAME;
  }
  return url.toString();
})();

export const publicS3Endpoint = () => _publicS3Endpoint;

export const uploadToS3FromBuffer = async (
  buffer: Buffer,
  contentType: string,
  key: string,
  acl: string
) => {
  await s3
    .putObject({
      ACL: acl,
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: buffer.length,
      Body: buffer,
    })
    .promise();
  const endpoint = publicS3Endpoint();
  return `${endpoint}/${key}`;
};

// @ts-expect-error ts-migrate(7030) FIXME: Not all code paths return a value.
export const uploadToS3FromUrl = async (
  url: string,
  key: string,
  acl: string
) => {
  try {
    const res = await fetch(url);
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'buffer' does not exist on type 'Response... Remove this comment to see the full error message
    const buffer = await res.buffer();
    await s3
      .putObject({
        ACL: acl,
        Bucket: AWS_S3_BUCKET_NAME,
        Key: key,
        ContentType: res.headers["content-type"],
        ContentLength: res.headers["content-length"],
        Body: buffer,
      })
      .promise();
    const endpoint = publicS3Endpoint();
    return `${endpoint}/${key}`;
  } catch (err) {
    Logger.error("Error uploading to S3 from URL", err, {
      url,
      key,
      acl,
    });
  }
};

export const deleteFromS3 = (key: string) => {
  return s3
    .deleteObject({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: key,
    })
    .promise();
};

export const getSignedUrl = async (key: string, expiresInMs = 60) => {
  const params = {
    Bucket: AWS_S3_BUCKET_NAME,
    Key: key,
    Expires: expiresInMs,
  };

  return await getSignedUrlPromise("getObject", params);
};

// function assumes that acl is private
export const getAWSKeyForFileOp = (teamId: string, name: string) => {
  const bucket = "uploads";
  return `${bucket}/${teamId}/${uuidv4()}/${name}-export.zip`;
};

export const getFileByKey = async (key: string) => {
  const params = {
    Bucket: AWS_S3_BUCKET_NAME,
    Key: key,
  };

  try {
    const data = await s3.getObject(params).promise();
    return data.Body || null;
  } catch (err) {
    Logger.error("Error getting file from S3 by key", err, {
      key,
    });
  }

  return null;
};
