import { observer } from "mobx-react";
import { ImportIcon } from "outline-icons";
import * as React from "react";
import Dropzone from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import {
  DropzoneContainer,
  dropzoneIcon,
} from "~/components/DropzoneContainer";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import useImportDocument from "~/hooks/useImportDocument";
import useStores from "~/hooks/useStores";

type Props = {
  /** The collection to import the documents into. */
  collectionId?: string | null;
  /** The document to import the documents as children of. */
  documentId?: string;
  /** Called once files have been chosen and the import has started. */
  onSubmit: () => void;
};

/**
 * A dialog that accepts documents to import, either dropped onto it or chosen
 * with the system file picker, and lists the file formats that are supported.
 */
export const ImportDocumentDialog = observer(function ImportDocumentDialog({
  collectionId,
  documentId,
  onSubmit,
}: Props) {
  const { t } = useTranslation();
  const { documents } = useStores();
  const { handleFiles } = useImportDocument(collectionId, documentId);

  const formats = React.useMemo(
    () => [
      {
        name: t("Markdown"),
        extensions: ".md, .markdown",
      },
      {
        name: t("Word"),
        extensions: ".docx",
      },
      {
        name: "HTML",
        extensions: ".html, .htm, .mhtml, .mht",
      },
      {
        name: "PDF",
        extensions: ".pdf",
      },
      {
        name: t("Plain text"),
        extensions: ".txt",
      },
      {
        name: "CSV",
        extensions: ".csv, .tsv",
      },
      {
        name: t("Email"),
        extensions: ".eml",
      },
      {
        name: "TextPack",
        extensions: ".textpack",
      },
    ],
    [t]
  );

  const handleDropAccepted = React.useCallback(
    (files: File[]) => {
      // Close the dialog before importing, progress is reported with a toast
      // and a successful import navigates to the new document.
      onSubmit();
      void handleFiles(files);
    },
    [handleFiles, onSubmit]
  );

  const handleDropRejected = React.useCallback(() => {
    toast.error(t("This file type is not supported"));
  }, [t]);

  return (
    <Columns gap={20}>
      <Dropzone
        accept={documents.importFileTypesString}
        onDropAccepted={handleDropAccepted}
        onDropRejected={handleDropRejected}
        multiple
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <DropTarget {...getRootProps()} $isDragActive={isDragActive}>
            <input {...getInputProps()} />
            <Flex align="center" justify="center" gap={8} column>
              <Icon size={32} color="#fff" />
              <Text type="secondary">
                {t(
                  "Drag and drop files here, or click to choose from your computer"
                )}
              </Text>
            </Flex>
          </DropTarget>
        )}
      </Dropzone>
      <Formats gap={12} column>
        <Text type="secondary" size="small" weight="bold">
          {t("Supported formats")}
        </Text>
        {formats.map((format) => (
          <Flex key={format.extensions} align="center" gap={8}>
            <Text size="small" weight="bold">
              {format.name}
            </Text>
            <Text size="small" type="tertiary">
              {format.extensions}
            </Text>
          </Flex>
        ))}
      </Formats>
    </Columns>
  );
});

const Icon = styled(ImportIcon)`
  ${dropzoneIcon}
`;

/** Below tablet width there is no room for two columns, so they stack. */
const Columns = styled(Flex)`
  flex-direction: column;

  ${breakpoint("tablet")`
    flex-direction: row;
  `}
`;

/** Fills its half so that the drop target is as tall as the format list. */
const DropTarget = styled(DropzoneContainer)`
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
`;

const Formats = styled(Flex)`
  flex: 1 1 0;
`;
