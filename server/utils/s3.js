// @flow
import crypto from 'crypto';
import addHours from 'date-fns/add_hours';
import format from 'date-fns/format';
import AWS from 'aws-sdk';
import invariant from 'invariant';
import fetch from 'isomorphic-fetch';
import bugsnag from 'bugsnag';

const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;
const AWS_S3_UPLOAD_BUCKET_NAME = process.env.AWS_S3_UPLOAD_BUCKET_NAME;

export const makeCredential = () => {
  const credential = AWS_SECRET_ACCESS_KEY + '/' + format(new Date(), 'YYYYMMDD') + '/' + AWS_REGION + '/s3/aws4_request';
  return credential
}

export const makePolicy = (credential: string, longDate: string) => {
  const tomorrow = addHours(new Date(), 24);
  const policy = {
    conditions: [
      { bucket: process.env.AWS_S3_UPLOAD_BUCKET_NAME },
      ['starts-with', '$key', ''],
      { acl: 'public-read' },
      ['content-length-range', 0, +process.env.AWS_S3_UPLOAD_MAX_SIZE],
      ['starts-with', '$Content-Type', 'image'],
      ['starts-with', '$Cache-Control', ''],
      { 'x-amz-algorithm': 'AWS4-HMAC-SHA256' },
      { 'x-amz-credential': credential },
      { 'x-amz-date': longDate },
    ],
    expiration: format(tomorrow, 'YYYY-MM-DDTHH:mm:ss\\Z'),
  };

  return new Buffer(JSON.stringify(policy)).toString('base64');
};

export const getSignature = (policy: any) => {
  const kSecret = 'AWS4' + AWS_SECRET_ACCESS_KEY;
  const kDate = crypto.createHmac('sha256', kSecret).update(format(new Date(), 'YYYYMMDD'));
  const kRegion = crypto.createHmac('sha256', kDate).update(process.env.AWS_REGION);
  const kService = crypto.createHmac('sha256', kRegion).update('s3');
  const kSigning = crypto.createHmac('sha256', kService).update('aws4_request');

  const signature = crypto.createHmac('sha256', kSigning).update(policy).digest('hex');
  return signature;
};

export const publicS3Endpoint = (isServerUpload?: boolean) => {
  // lose trailing slash if there is one and convert fake-s3 url to localhost
  // for access outside of docker containers in local development
  const isDocker = process.env.AWS_S3_UPLOAD_BUCKET_URL.match(/http:\/\/s3:/);
  const host = process.env.AWS_S3_UPLOAD_BUCKET_URL.replace(
    's3:',
    'localhost:'
  ).replace(/\/$/, '');

  return `${host}/${isServerUpload && isDocker ? 's3/' : ''}${
    process.env.AWS_S3_UPLOAD_BUCKET_NAME
  }`;
};

export const uploadToS3FromUrl = async (url: string, key: string) => {
  const s3 = new AWS.S3({
    s3ForcePathStyle: true,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: new AWS.Endpoint(process.env.AWS_S3_UPLOAD_BUCKET_URL),
  });
  invariant(AWS_S3_UPLOAD_BUCKET_NAME, 'AWS_S3_UPLOAD_BUCKET_NAME not set');

  try {
    // $FlowIssue https://github.com/facebook/flow/issues/2171
    const res = await fetch(url);
    const buffer = await res.buffer();
    await s3
      .putObject({
        ACL: 'public-read',
        Bucket: process.env.AWS_S3_UPLOAD_BUCKET_NAME,
        Key: key,
        ContentType: res.headers['content-type'],
        ContentLength: res.headers['content-length'],
        ServerSideEncryption: 'AES256',
        Body: buffer,
      })
      .promise();

    const endpoint = publicS3Endpoint(true);
    return `${endpoint}/${key}`;
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      bugsnag.notify(err);
    } else {
      throw err;
    }
  }
};
