// @flow
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import Queue from 'bull';
import debug from 'debug';
import unescape from '../shared/utils/unescape';
import { Collection, Document } from './models';
import { sendEmail } from './mailer';

const log = debug('logistics');
const logisticsQueue = new Queue('logistics', process.env.REDIS_URL);

async function addToZip(zip, documents) {
  for (const doc of documents) {
    const document = await Document.findById(doc.id);

    log('Adding to zip', document.title);
    zip.file(`${document.title}.md`, unescape(document.text));

    if (doc.children.length) {
      log('Creating folder', document.title);
      const folder = zip.folder(document.title);
      await addToZip(folder, doc.children);
    }
  }
}

logisticsQueue.process(async job => {
  log('process', job.data);

  if (job.data.type === 'export-collection') {
    const zip = new JSZip();
    const fileName = `${job.data.collectionId}.zip`;
    const collection = await Collection.findById(job.data.collectionId);

    log(collection.documentStructure);
    await addToZip(zip, collection.documentStructure);

    await zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(fs.createWriteStream(fileName))
      .on('finish', function() {
        log('finish', collection.name);

        const filePath = path.resolve(fileName);
        log('filePath', filePath);

        sendEmail('export', job.data.email, {
          attachments: [
            {
              filename: `${collection.name}.zip`,
              path: filePath,
            },
          ],
        });
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
