// @flow
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import unescape from '../../shared/utils/unescape';
import { Collection, Document } from '../models';

async function addToArchive(zip, documents) {
  for (const doc of documents) {
    const document = await Document.findById(doc.id);

    zip.file(`${document.title}.md`, unescape(document.text));

    if (doc.children.length) {
      const folder = zip.folder(document.title);
      await addToArchive(folder, doc.children);
    }
  }
}

export async function archiveCollection(
  collection: Collection
): Promise<string> {
  const zip = new JSZip();
  const fileName = `${collection.name} (${collection.id}).zip`;

  await addToArchive(zip, collection.documentStructure);

  return new Promise(resolve => {
    zip
      .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
      .pipe(fs.createWriteStream(fileName))
      .on('finish', function() {
        resolve(path.resolve(fileName));
      });
  });
}
