import { observer } from "mobx-react";
import { ImportIcon } from "outline-icons";
import * as React from "react";
import Dropzone from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import {
  DropzoneContainer,
  dropzoneIcon,
} from "~/components/DropzoneContainer";
import Flex from "~/components/Flex";
import { FileFormatIcon } from "~/components/Icons/FileFormatIcon";
import MarkdownIcon from "~/components/Icons/MarkdownIcon";
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
        icon: <MarkdownIcon size={28} />,
      },
      {
        name: t("Word"),
        extensions: ".docx",
        icon: <FileFormatIcon label="DOC" size={28} />,
      },
      {
        name: "HTML",
        extensions: ".html, .htm, .mhtml, .mht",
        icon: <FileFormatIcon label="HTM" size={28} />,
      },
      {
        name: t("Plain text"),
        extensions: ".txt",
        icon: <FileFormatIcon label="TXT" size={28} />,
      },
      {
        name: "CSV",
        extensions: ".csv, .tsv",
        icon: <FileFormatIcon label="CSV" size={28} />,
      },
      {
        name: t("Email"),
        extensions: ".eml",
        icon: <FileFormatIcon label="EML" size={28} />,
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
    <Flex gap={20} column>
      <Dropzone
        accept={documents.importFileTypesString}
        onDropAccepted={handleDropAccepted}
        onDropRejected={handleDropRejected}
        multiple
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <DropzoneContainer {...getRootProps()} $isDragActive={isDragActive}>
            <input {...getInputProps()} />
            <Flex align="center" justify="center" gap={8} column>
              <Icon size={32} color="#fff" />
              <Text type="secondary">
                {t(
                  "Drag and drop files here, or click to choose from your computer"
                )}
              </Text>
            </Flex>
          </DropzoneContainer>
        )}
      </Dropzone>
      <Flex gap={8} column>
        <Text size="xsmall" weight="bold" type="tertiary">
          {t("Supported formats")}
        </Text>
        <Formats>
          {formats.map((format) => (
            <Format key={format.extensions} align="center" gap={8}>
              {format.icon}
              <Flex column>
                <Text size="small">{format.name}</Text>
                <Text size="xsmall" type="tertiary">
                  {format.extensions}
                </Text>
              </Flex>
            </Format>
          ))}
        </Formats>
      </Flex>
    </Flex>
  );
});

const Icon = styled(ImportIcon)`
  ${dropzoneIcon}
`;

const Formats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
`;

const Format = styled(Flex)`
  svg {
    flex-shrink: 0;
  }
`;
