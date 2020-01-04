// @flow
import fs from 'fs';
import JSZip from 'jszip';
import tmp from 'tmp';
import unescape from '../../shared/utils/unescape';
import { Collection, Document } from '../models';
import { getImageByKey } from './s3';

const proxyS3UrlRegex = /(?<=!\[.*\]\()(\/api\/images\.info\?key=.*)(?=\))/gi;

async function addToArchive(zip, documents) {
  for (const doc of documents) {
    const document = await Document.findByPk(doc.id);
    let text = unescape(document.text);

    if (process.env.AWS_S3_ACL !== 'public-read') {
      const matches = text.match(proxyS3UrlRegex);
      if (matches !== null) {
        for (const match of matches) {
          const key = match.slice(21);
          await addImageToArchive(zip, decodeURI(key));
        }
        text = text.replace(proxyS3UrlRegex, (match) => match.slice(21));
      }
    }

    zip.file(`${document.title}.md`, text);

    if (doc.children && doc.children.length) {
      const folder = zip.folder(document.title);
      await addToArchive(folder, doc.children);
    }
  }
}

async function addImageToArchive(zip, key) {
  const img = await getImageByKey(key);
  zip.file(key, img, { createFolders: true });
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

  if (collection.documentStructure) {
    await addToArchive(zip, collection.documentStructure);
  }

  return archiveToPath(zip);
}

export async function archiveCollections(collections: Collection[]) {
  const zip = new JSZip();

  for (const collection of collections) {
    if (collection.documentStructure) {
      const folder = zip.folder(collection.name);
      await addToArchive(folder, collection.documentStructure);
    }
  }
  return archiveToPath(zip);
}
