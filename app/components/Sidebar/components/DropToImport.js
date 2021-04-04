// @flow
import { observer } from "mobx-react";
import * as React from "react";
import Dropzone from "react-dropzone";
import styled, { css } from "styled-components";
import LoadingIndicator from "components/LoadingIndicator";
import useImportDocument from "hooks/useImportDocument";
import useStores from "hooks/useStores";

const EMPTY_OBJECT = {};

type Props = {|
  children: React.Node,
  collectionId: string,
  documentId?: string,
  disabled: boolean,
  staticContext: Object,
|};

function DropToImport({ disabled, children, collectionId, documentId }: Props) {
  const { documents } = useStores();
  const { handleFiles, isImporting } = useImportDocument(
    collectionId,
    documentId
  );

  if (disabled) {
    return children;
  }

  return (
    <Dropzone
      accept={documents.importFileTypes.join(", ")}
      onDropAccepted={handleFiles}
      style={EMPTY_OBJECT}
      noClick
      multiple
    >
      {({
        getRootProps,
        getInputProps,
        isDragActive,
        isDragAccept,
        isDragReject,
      }) => (
        <DropzoneContainer
          {...getRootProps()}
          {...{ isDragActive }}
          tabIndex="-1"
        >
          <input {...getInputProps()} />
          {isImporting && <LoadingIndicator />}
          {children}
        </DropzoneContainer>
      )}
    </Dropzone>
  );
}

const DropzoneContainer = styled.div`
  border-radius: 4px;

  ${({ isDragActive, theme }) =>
    isDragActive &&
    css`
      background: ${theme.slateDark};
      a {
        color: ${theme.white} !important;
      }
      svg {
        fill: ${theme.white};
      }
    `}
`;

export default observer(DropToImport);
