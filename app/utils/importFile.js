// @flow
import Document from "models/Document";
import DocumentsStore from "stores/DocumentsStore";
import parseTitle from "shared/utils/parseTitle";

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
