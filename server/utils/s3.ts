import util from "util";
import AWS, { S3 } from "aws-sdk";
import fetch from "fetch-with-proxy";
import { compact } from "lodash";
import { useAgent } from "request-filtering-agent";
import { v4 as uuidv4 } from "uuid";
import Logger from "@server/logging/Logger";

const AWS_S3_ACCELERATE_URL = process.env.AWS_S3_ACCELERATE_URL;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_S3_UPLOAD_BUCKET_URL = process.env.AWS_S3_UPLOAD_BUCKET_URL || "";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_REGION = process.env.AWS_REGION || "";
const AWS_S3_UPLOAD_BUCKET_NAME = process.env.AWS_S3_UPLOAD_BUCKET_NAME || "";
const AWS_S3_FORCE_PATH_STYLE = process.env.AWS_S3_FORCE_PATH_STYLE !== "false";

const s3 = new AWS.S3({
  s3BucketEndpoint: AWS_S3_ACCELERATE_URL ? true : undefined,
  s3ForcePathStyle: AWS_S3_FORCE_PATH_STYLE,
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
  endpoint: AWS_S3_ACCELERATE_URL
    ? AWS_S3_ACCELERATE_URL
    : AWS_S3_UPLOAD_BUCKET_URL.includes(AWS_S3_UPLOAD_BUCKET_NAME)
    ? undefined
    : new AWS.Endpoint(AWS_S3_UPLOAD_BUCKET_URL),
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
    Bucket: process.env.AWS_S3_UPLOAD_BUCKET_NAME,
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
  if (AWS_S3_ACCELERATE_URL) {
    return AWS_S3_ACCELERATE_URL;
  }

  // lose trailing slash if there is one and convert fake-s3 url to localhost
  // for access outside of docker containers in local development
  const isDocker = AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);

  const host = AWS_S3_UPLOAD_BUCKET_URL.replace("s3:", "localhost:").replace(
    /\/$/,
    ""
  );

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
  await s3
    .putObject({
      ACL: acl,
      Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
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
        Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
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

export const deleteFromS3 = (key: string) =>
  s3
    .deleteObject({
      Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
      Key: key,
    })
    .promise();

export const getSignedUrl = async (key: string, expiresIn = 60) => {
  const isDocker = AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);
  const params = {
    Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
    Key: key,
    Expires: expiresIn,
    ResponseContentDisposition: "attachment",
  };

  const url = isDocker
    ? `${publicS3Endpoint()}/${key}`
    : await s3.getSignedUrlPromise("getObject", params);

  if (AWS_S3_ACCELERATE_URL) {
    return url.replace(AWS_S3_UPLOAD_BUCKET_URL, AWS_S3_ACCELERATE_URL);
  }

  return url;
};

// function assumes that acl is private
export const getAWSKeyForFileOp = (teamId: string, name: string) => {
  const bucket = "uploads";
  return `${bucket}/${teamId}/${uuidv4()}/${name}-export.zip`;
};

export const getFileStream = (key: string) => {
  try {
    return s3
      .getObject({
        Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
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
  const response = await s3
    .getObject({
      Bucket: AWS_S3_UPLOAD_BUCKET_NAME,
      Key: key,
    })
    .promise();

  if (response.Body) {
    return response.Body as Blob;
  }

  throw new Error("Error getting file buffer from S3");
};
