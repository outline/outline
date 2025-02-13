import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import EditorContainer from "@shared/editor/components/Styles";
import { colorPalette } from "@shared/utils/collections";
import Document from "~/models/Document";
import Revision from "~/models/Revision";
import { Props as EditorProps } from "~/components/Editor";
import Flex from "~/components/Flex";
import { documentPath } from "~/utils/routeHelpers";
import { Meta as DocumentMeta } from "./DocumentMeta";
import DocumentTitle from "./DocumentTitle";
import { useRevNav } from "./RevisionViewer.helper";

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
  const { editorRef, selectedOpIndex, NavBar } = useRevNav(revision.html);

  return (
    <Flex auto column>
      <NavBar />
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
      <EditorContainerStyled
        ref={editorRef}
        dangerouslySetInnerHTML={{ __html: revision.html }}
        dir={revision.dir}
        rtl={revision.rtl}
        selectedOpIndex={selectedOpIndex}
      />
      {children}
    </Flex>
  );
}

const EditorContainerStyled = styled(EditorContainer)<{
  selectedOpIndex: number;
}>`
  @keyframes transientMarker {
    from {
      border-bottom-color: rgba(251, 247, 25, 1);
    }
    to {
      border-bottom-color: rgba(251, 247, 25, 0);
    }
  }

  [data-operation-index="${(props) => props.selectedOpIndex}"] {
    // Note: This assumes that the original diff-styling doesn't use border-*
    animation: transientMarker 3s forwards;
    border-bottom: 3px solid rgba(251, 247, 25, 1);
    box-sizing: border-box;
  }
`;

export default observer(RevisionViewer);
