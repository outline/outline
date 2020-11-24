// @flow
import crypto from "crypto";
import * as Sentry from "@sentry/node";
import AWS from "aws-sdk";
import addHours from "date-fns/add_hours";
import format from "date-fns/format";
import fetch from "isomorphic-fetch";

const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_REGION = process.env.AWS_REGION;
const AWS_S3_UPLOAD_BUCKET_NAME = process.env.AWS_S3_UPLOAD_BUCKET_NAME || "";
const AWS_S3_FORCE_PATH_STYLE = process.env.AWS_S3_FORCE_PATH_STYLE !== "false";

const s3 = new AWS.S3({
  s3ForcePathStyle: AWS_S3_FORCE_PATH_STYLE,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  endpoint: new AWS.Endpoint(process.env.AWS_S3_UPLOAD_BUCKET_URL),
  signatureVersion: "v4",
});

const hmac = (key: string, message: string, encoding: any) => {
  return crypto
    .createHmac("sha256", key)
    .update(message, "utf8")
    .digest(encoding);
};

export const makeCredential = () => {
  const credential =
    AWS_ACCESS_KEY_ID +
    "/" +
    format(new Date(), "YYYYMMDD") +
    "/" +
    AWS_REGION +
    "/s3/aws4_request";
  return credential;
};

export const makePolicy = (
  credential: string,
  longDate: string,
  acl: string
) => {
  const tomorrow = addHours(new Date(), 24);
  const policy = {
    conditions: [
      { bucket: process.env.AWS_S3_UPLOAD_BUCKET_NAME },
      ["starts-with", "$key", ""],
      { acl },
      ["content-length-range", 0, +process.env.AWS_S3_UPLOAD_MAX_SIZE],
      ["starts-with", "$Content-Type", "image"],
      ["starts-with", "$Cache-Control", ""],
      { "x-amz-algorithm": "AWS4-HMAC-SHA256" },
      { "x-amz-credential": credential },
      { "x-amz-date": longDate },
    ],
    expiration: format(tomorrow, "YYYY-MM-DDTHH:mm:ss\\Z"),
  };

  return new Buffer(JSON.stringify(policy)).toString("base64");
};

export const getSignature = (policy: any) => {
  const kDate = hmac(
    "AWS4" + AWS_SECRET_ACCESS_KEY,
    format(new Date(), "YYYYMMDD")
  );
  const kRegion = hmac(kDate, AWS_REGION);
  const kService = hmac(kRegion, "s3");
  const kCredentials = hmac(kService, "aws4_request");

  const signature = hmac(kCredentials, policy, "hex");
  return signature;
};

export const publicS3Endpoint = (isServerUpload?: boolean) => {
  // lose trailing slash if there is one and convert fake-s3 url to localhost
  // for access outside of docker containers in local development
  const isDocker = process.env.AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);
  const host = process.env.AWS_S3_UPLOAD_BUCKET_URL.replace(
    "s3:",
    "localhost:"
  ).replace(/\/$/, "");

  return `${host}/${
    isServerUpload && isDocker ? "s3/" : ""
  }${AWS_S3_UPLOAD_BUCKET_NAME}`;
};

export const uploadToS3FromBuffer = async (
  buffer: Buffer,
  contentType: string,
  key: string,
  acl: string
) => {
  await s3
    .putObject({
      ACL: acl,
      Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      ContentLength: buffer.length,
      ServerSideEncryption: "AES256",
      Body: buffer,
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
  try {
    // $FlowIssue https://github.com/facebook/flow/issues/2171
    const res = await fetch(url);
    const buffer = await res.buffer();
    await s3
      .putObject({
        ACL: acl,
        Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
        Key: key,
        ContentType: res.headers["content-type"],
        ContentLength: res.headers["content-length"],
        ServerSideEncryption: "AES256",
        Body: buffer,
      })
      .promise();

    const endpoint = publicS3Endpoint(true);
    return `${endpoint}/${key}`;
  } catch (err) {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    } else {
      throw err;
    }
  }
};

export const deleteFromS3 = (key: string) => {
  return s3
    .deleteObject({
      Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
      Key: key,
    })
    .promise();
};

export const getSignedImageUrl = async (key: string) => {
  const isDocker = process.env.AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);

  const params = {
    Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
    Key: key,
    Expires: 60,
  };

  return isDocker
    ? `${publicS3Endpoint()}/${key}`
    : s3.getSignedUrl("getObject", params);
};

export const getImageByKey = async (key: string) => {
  const params = {
    Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
    Key: key,
  };

  try {
    const data = await s3.getObject(params).promise();
    return data.Body;
  } catch (err) {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    } else {
      throw err;
    }
  }
};
