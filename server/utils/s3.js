import crypto from 'crypto';
import moment from 'moment';

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

const signPolicy = policy => {
  const signature = crypto
    .createHmac('sha1', process.env.AWS_SECRET_ACCESS_KEY)
    .update(policy)
    .digest('base64');

  return signature;
};

export { makePolicy, signPolicy };
