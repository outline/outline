// @flow
import crypto from 'crypto';
import moment from 'moment';
import AWS from 'aws-sdk';
import invariant from 'invariant';
import fetch from 'isomorphic-fetch';
import bugsnag from 'bugsnag';

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_S3_UPLOAD_BUCKET_NAME = process.env.AWS_S3_UPLOAD_BUCKET_NAME;

const makePolicy = () => {
  const policy = {
    conditions: [
      { bucket: process.env.AWS_S3_UPLOAD_BUCKET_NAME },
      ['starts-with', '$key', ''],
      { acl: 'public-read' },
      ['content-length-range', 0, process.env.AWS_S3_UPLOAD_MAX_SIZE],
      ['starts-with', '$Content-Type', 'image'],
      ['starts-with', '$Cache-Control', ''],
    ],
    expiration: moment()
      .add(24 * 60, 'minutes')
      .format('YYYY-MM-DDTHH:mm:ss\\Z'),
  };

  return new Buffer(JSON.stringify(policy)).toString('base64');
};

const signPolicy = (policy: any) => {
  invariant(AWS_SECRET_ACCESS_KEY, 'AWS_SECRET_ACCESS_KEY not set');
  const signature = crypto
    .createHmac('sha1', AWS_SECRET_ACCESS_KEY)
    .update(policy)
    .digest('base64');

  return signature;
};

const uploadToS3FromUrl = async (url: string, key: string) => {
  const s3 = new AWS.S3();
  invariant(AWS_S3_UPLOAD_BUCKET_NAME, 'AWS_S3_UPLOAD_BUCKET_NAME not set');

  try {
    // $FlowIssue dunno it's fine
    const res = await fetch(url);
    const buffer = await res.buffer();
    await s3
      .putObject({
        Bucket: process.env.AWS_S3_UPLOAD_BUCKET_NAME,
        Key: key,
        ContentType: res.headers['content-type'],
        ContentLength: res.headers['content-length'],
        Body: buffer,
      })
      .promise();
    return `https://s3.amazonaws.com/${AWS_S3_UPLOAD_BUCKET_NAME}/${key}`;
  } catch (e) {
    bugsnag.notify(e);
  }
};

export { makePolicy, signPolicy, uploadToS3FromUrl };
