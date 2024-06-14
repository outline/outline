import { observer } from "mobx-react";
import * as React from "react";
import EditorContainer from "@shared/editor/components/Styles";
import { colorPalette } from "@shared/utils/collections";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import { Props as EditorProps } from "~/components/Editor";
import Flex from "~/components/Flex";
import { documentPath } from "~/utils/routeHelpers";
import { Meta as DocumentMeta } from "./DocumentMeta";
import DocumentTitle from "./DocumentTitle";

type Props = Omit<EditorProps, "extensions"> & {
  /** The ID of the revision */
  id: string;
  /** The current document */
  document: Document;
  /** The revision to display */
  revision: Revision;
  children?: React.ReactNode;
};

/**
 * Displays revision HTML pre-rendered on the server.
 */
function RevisionViewer(props: Props) {
  const { document, children, revision } = props;

  return (
    <Flex
      auto
      column
    >
      <DocumentTitle
        documentId={revision.documentId}
        title={revision.title}
        icon={revision.icon}
        color={revision.color ?? colorPalette[0]}
        readOnly
      />
      <DocumentMeta
        document={document}
        revision={revision}
        to={documentPath(document)}
        rtl={revision.rtl}
      />
      <EditorContainer
        dangerouslySetInnerHTML={{ __html: revision.html }}
        dir={revision.dir}
        rtl={revision.rtl}
      />
      {children}
    </Flex>
  );
}

export default observer(RevisionViewer);
