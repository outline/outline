// @flow
import Queue from 'bull';
import debug from 'debug';
import mailer from './mailer';
import { Collection, Team } from './models';
import { archiveCollection, archiveCollections } from './utils/zip';

const log = debug('logistics');
const logisticsQueue = new Queue('logistics', process.env.REDIS_URL);
const queueOptions = {
  attempts: 2,
  removeOnComplete: true,
  backoff: {
    type: 'exponential',
    delay: 60 * 1000,
  },
};

async function exportAndEmailCollection(collectionId: string, email: string) {
  log('Archiving collection', collectionId);
  const collection = await Collection.findByPk(collectionId);
  const filePath = await archiveCollection(collection);

  log('Archive path', filePath);

  mailer.export({
    to: email,
    attachments: [
      {
        filename: `${collection.name} Export.zip`,
        path: filePath,
      },
    ],
  });
}

async function exportAndEmailCollections(teamId: string, email: string) {
  log('Archiving team', teamId);
  const team = await Team.findByPk(teamId);
  const collections = await Collection.findAll({
    where: { teamId },
    order: [['name', 'ASC']],
  });
  const filePath = await archiveCollections(collections);

  log('Archive path', filePath);

  mailer.export({
    to: email,
    attachments: [
      {
        filename: `${team.name} Export.zip`,
        path: filePath,
      },
    ],
  });
}

logisticsQueue.process(async job => {
  log('Process', job.data);

  switch (job.data.type) {
    case 'export-collection':
      return await exportAndEmailCollection(
        job.data.collectionId,
        job.data.email
      );
    case 'export-collections':
      return await exportAndEmailCollections(job.data.teamId, job.data.email);
    default:
  }
});

export const exportCollection = (collectionId: string, email: string) => {
  logisticsQueue.add(
    {
      type: 'export-collection',
      collectionId,
      email,
    },
    queueOptions
  );
};

export const exportCollections = (teamId: string, email: string) => {
  logisticsQueue.add(
    {
      type: 'export-collections',
      teamId,
      email,
    },
    queueOptions
  );
};
