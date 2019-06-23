// @flow
import fs from 'fs';
import JSZip from 'jszip';
import tmp from 'tmp';
import unescape from '../../shared/utils/unescape';
import { Collection, Document } from '../models';

async function addToArchive(zip, documents) {
  for (const doc of documents) {
    const document = await Document.findByPk(doc.id);

    zip.file(`${document.title}.md`, unescape(document.text));

    if (doc.children && doc.children.length) {
      const folder = zip.folder(document.title);
      await addToArchive(folder, doc.children);
    }
  }
}

async function archiveToPath(zip) {
  return new Promise((resolve, reject) => {
    tmp.file({ prefix: 'export-', postfix: '.zip' }, (err, path) => {
      if (err) return reject(err);

      zip
        .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
        .pipe(fs.createWriteStream(path))
        .on('finish', () => resolve(path))
        .on('error', reject);
    });
  });
}

export async function archiveCollection(collection: Collection) {
  const zip = new JSZip();
  await addToArchive(zip, collection.documentStructure);
  return archiveToPath(zip);
}

export async function archiveCollections(collections: Collection[]) {
  const zip = new JSZip();

  for (const collection of collections) {
    const folder = zip.folder(collection.name);
    await addToArchive(folder, collection.documentStructure);
  }
  return archiveToPath(zip);
}
