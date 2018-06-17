// @flow
import Queue from 'bull';
import debug from 'debug';
import Mailer from './mailer';
import { Collection } from './models';
import { archiveCollection } from './utils/zip';

const log = debug('logistics');
const logisticsQueue = new Queue('logistics', process.env.REDIS_URL);
const mailer = new Mailer();

logisticsQueue.process(async job => {
  log('process', job.data);

  if (job.data.type === 'export-collection') {
    log('Archiving', job.data.collectionId);
    const collection = await Collection.findById(job.data.collectionId);
    const filePath = await archiveCollection(collection);

    log('Archive path', filePath);

    mailer.export({
      to: job.data.email,
      attachments: [
        {
          filename: `${collection.name}.zip`,
          path: filePath,
        },
      ],
    });
  }
});

export const exportCollection = (collectionId: string, email: string) => {
  logisticsQueue.add(
    {
      type: 'export-collection',
      collectionId,
      email,
    },
    {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 60 * 1000,
      },
    }
  );
};
