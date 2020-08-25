// @flow
import parseTitle from "shared/utils/parseTitle";
import DocumentsStore from "stores/DocumentsStore";
import Document from "models/Document";

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
  return new Promise(async (resolve, reject) => {
    // non plain text support
    if (documents.importFiletypes.includes(file.type)) {
      try {
        const document = new Document(
          {
            parentDocumentId: documentId,
            collectionId,
            title: file.name.replace(/\.[^/.]+$/, ""),
          },
          documents
        );

        resolve(await documents.import(document, { publish: true, file }));
      } catch (err) {
        reject(err);
      }
      return;
    }

    const reader = new FileReader();

    reader.onload = async (ev) => {
      try {
        let text = ev.target.result;
        let title;

        // If the first line of the imported file looks like a markdown heading
        // then we can use this as the document title
        if (text.trim().startsWith("# ")) {
          const result = parseTitle(text);
          title = result.title;
          text = text.replace(`# ${title}\n`, "");

          // otherwise, just use the filename without the extension as our best guess
        } else {
          title = file.name.replace(/\.[^/.]+$/, "");
        }

        let document = new Document(
          {
            parentDocumentId: documentId,
            collectionId,
            text,
            title,
          },
          documents
        );

        document = await document.save({ publish: true });
        resolve(document);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
};

async function processAndSaveDocument(
  ev,
  { documents, file, documentId, collectionId }: Options,
  isUpload = false
) {
  // let text = (ev && ev.target.result) || "";
  // let title;
  // // If the first line of the imported file looks like a markdown heading
  // // then we can use this as the document title
  // if (text.trim().startsWith("# ")) {
  //   const result = parseTitle(text);
  //   title = result.title;
  //   text = text.replace(`# ${title}\n`, "");
  //   // otherwise, just use the filename without the extension as our best guess
  // } else {
  //   title = file.name.replace(/\.[^/.]+$/, "");
  // }
  // let document = new Document(
  //   {
  //     parentDocumentId: documentId,
  //     collectionId,
  //     text,
  //     title,
  //   },
  //   documents
  // );
  // const saveOpts = { publish: true };
  // if (isUpload) {
  //   document = await document.import({ ...saveOpts, file });
  // } else {
  //   document = await document.save(saveOpts);
  // }
  // return document;
}

export default importFile;
