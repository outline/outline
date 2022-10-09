import invariant from "invariant";
import { observer } from "mobx-react";
import * as React from "react";
import DocumentModel from "~/models/Document";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";

type Props = {
  documentId: string;
};

function WordCountDialog({ documentId }: Props) {
  const { documents } = useStores();
  const document = documents.get(documentId);
  invariant(document, "Document must exist");

  return (
    <Flex>
      <Text style={{ flexGrow: 1 }}>Words</Text>
      <Text>{calculateWordCount(document)}</Text>
    </Flex>
  );
}

function calculateWordCount(document: DocumentModel): string {
  const numTotalWords = countWords(document.text);

  const selectedText = window.getSelection();
  return selectedText?.toString().length
    ? `${countWords(selectedText.toString())} of ${numTotalWords}`
    : numTotalWords.toString();
}

function countWords(text: string): number {
  return text.split(" ").length;
}

export default observer(WordCountDialog);
