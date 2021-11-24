import crypto from "crypto";
import AWS from "aws-sdk";
import { addHours, format } from "date-fns";
import fetch from "fetch-with-proxy";
import { v4 as uuidv4 } from "uuid";
import Logger from "@server/logging/logger";

const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_REGION = process.env.AWS_REGION;
const AWS_S3_UPLOAD_BUCKET_NAME = process.env.AWS_S3_UPLOAD_BUCKET_NAME || "";
const AWS_S3_FORCE_PATH_STYLE = process.env.AWS_S3_FORCE_PATH_STYLE !== "false";
const s3 = new AWS.S3({
  s3ForcePathStyle: AWS_S3_FORCE_PATH_STYLE,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
  // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
  endpoint: process.env.AWS_S3_UPLOAD_BUCKET_URL.includes(
    AWS_S3_UPLOAD_BUCKET_NAME
  )
    ? undefined
    : // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string | undefined' is not assig... Remove this comment to see the full error message
      new AWS.Endpoint(process.env.AWS_S3_UPLOAD_BUCKET_URL),
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
    format(new Date(), "yyyyMMdd") +
    "/" +
    AWS_REGION +
    "/s3/aws4_request";
  return credential;
};

export const makePolicy = (
  credential: string,
  longDate: string,
  acl: string,
  contentType = "image"
) => {
  const tomorrow = addHours(new Date(), 24);
  const policy = {
    conditions: [
      {
        bucket: process.env.AWS_S3_UPLOAD_BUCKET_NAME,
      },
      ["starts-with", "$key", ""],
      {
        acl,
      },
      // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
      ["content-length-range", 0, +process.env.AWS_S3_UPLOAD_MAX_SIZE],
      ["starts-with", "$Content-Type", contentType],
      ["starts-with", "$Cache-Control", ""],
      {
        "x-amz-algorithm": "AWS4-HMAC-SHA256",
      },
      {
        "x-amz-credential": credential,
      },
      {
        "x-amz-date": longDate,
      },
    ],
    expiration: format(tomorrow, "yyyy-MM-dd'T'HH:mm:ss'Z'"),
  };
  return Buffer.from(JSON.stringify(policy)).toString("base64");
};

export const getSignature = (policy: any) => {
  // @ts-expect-error ts-migrate(2554) FIXME: Expected 3 arguments, but got 2.
  const kDate = hmac(
    "AWS4" + AWS_SECRET_ACCESS_KEY,
    format(new Date(), "yyyyMMdd")
  );
  // @ts-expect-error ts-migrate(2554) FIXME: Expected 3 arguments, but got 2.
  const kRegion = hmac(kDate, AWS_REGION);
  // @ts-expect-error ts-migrate(2554) FIXME: Expected 3 arguments, but got 2.
  const kService = hmac(kRegion, "s3");
  // @ts-expect-error ts-migrate(2554) FIXME: Expected 3 arguments, but got 2.
  const kCredentials = hmac(kService, "aws4_request");
  const signature = hmac(kCredentials, policy, "hex");
  return signature;
};

export const publicS3Endpoint = (isServerUpload?: boolean) => {
  // lose trailing slash if there is one and convert fake-s3 url to localhost
  // for access outside of docker containers in local development
  // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
  const isDocker = process.env.AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);

  // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
  const host = process.env.AWS_S3_UPLOAD_BUCKET_URL.replace(
    "s3:",
    "localhost:"
  ).replace(/\/$/, "");

  // support old path-style S3 uploads and new virtual host uploads by checking
  // for the bucket name in the endpoint url before appending.
  const isVirtualHost = host.includes(AWS_S3_UPLOAD_BUCKET_NAME);

  if (isVirtualHost) {
    return host;
  }

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
      Body: buffer,
    })
    .promise();
  const endpoint = publicS3Endpoint(true);
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
        Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
        Key: key,
        ContentType: res.headers["content-type"],
        ContentLength: res.headers["content-length"],
        Body: buffer,
      })
      .promise();
    const endpoint = publicS3Endpoint(true);
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
      Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
      Key: key,
    })
    .promise();
};

export const getSignedUrl = async (key: string) => {
  // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
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

// function assumes that acl is private
export const getAWSKeyForFileOp = (teamId: string, name: string) => {
  const bucket = "uploads";
  return `${bucket}/${teamId}/${uuidv4()}/${name}-export.zip`;
};

// @ts-expect-error ts-migrate(7030) FIXME: Not all code paths return a value.
export const getFileByKey = async (key: string) => {
  const params = {
    Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
    Key: key,
  };

  try {
    const data = await s3.getObject(params).promise();
    return data.Body;
  } catch (err) {
    Logger.error("Error getting file from S3 by key", err, {
      key,
    });
  }
};
