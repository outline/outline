// @flow
import Document from '../models/Document';
import DocumentsStore from '../stores/DocumentsStore';

type Options = {
  file: File,
  documents: DocumentsStore,
  collectionId: string,
  documentId?: string,
};

const importFile = async ({
  documents,
  file,
  documentId,
  collectionId,
}: Options): Promise<Document> => {
  return new Promise(resolve => {
    const reader = new FileReader();

    reader.onload = async ev => {
      const text = ev.target.result;
      let data = {
        parentDocument: undefined,
        collection: { id: collectionId },
        text,
      };

      if (documentId) data.parentDocument = documentId;

      let document = new Document(data);
      document = await document.save({ publish: true });
      documents.add(document);
      resolve(document);
    };
    reader.readAsText(file);
  });
};

export default importFile;
