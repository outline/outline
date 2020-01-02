// @flow
import fs from 'fs';
import JSZip from 'jszip';
import tmp from 'tmp';
import unescape from '../../shared/utils/unescape';
import { Collection, Document } from '../models';
import { getImageByKey } from './s3';

const ENABLE_PRIVATE_CONTENT = process.env.ENABLE_PRIVATE_CONTENT === 'true';
const s3KeyRegex = /!\[.*\]\(\/api\/images\.info\?key=(?<key>.*)\)/gi;
const imgageApiRegex = /(?<=!\[.*\]\()(\/api\/images\.info\?key=)/gi;

async function addToArchive(zip, documents) {
  for (const doc of documents) {
    const document = await Document.findByPk(doc.id);
    let text = unescape(document.text);

    if (ENABLE_PRIVATE_CONTENT) {
      const imageKeys = [...text.matchAll(s3KeyRegex)].map(
        match => match.groups && match.groups.key
      );
      await addImagesToArchive(zip, imageKeys);
      text = text.replace(imgageApiRegex, '');
    }

    zip.file(`${document.title}.md`, text);

    if (doc.children && doc.children.length) {
      const folder = zip.folder(document.title);
      await addToArchive(folder, doc.children);
    }
  }
}

async function addImagesToArchive(zip, imageKeys) {
  for (const key of imageKeys) {
    if (key) {
      const img = await getImageByKey(decodeURI(key));
      zip.file(decodeURI(key), img, { createFolders: true });
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
