// @flow
import Document from 'models/Document';
import DocumentsStore from 'stores/DocumentsStore';

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
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async ev => {
      const text = ev.target.result;

      let document = new Document(
        {
          parentDocumentId: documentId,
          collectionId,
          text,
        },
        documents
      );
      try {
        document = await document.save({ publish: true });
        resolve(document);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
};

export default importFile;
