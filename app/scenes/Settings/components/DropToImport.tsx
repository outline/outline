import { observer } from "mobx-react";
import { NewDocumentIcon } from "outline-icons";
import * as React from "react";
import Dropzone from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import { AttachmentPreset, CollectionPermission } from "@shared/types";
import { bytesToHumanReadable } from "@shared/utils/files";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import InputSelectPermission from "~/components/InputSelectPermission";
import LoadingIndicator from "~/components/LoadingIndicator";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { EmptySelectValue } from "~/types";
import { uploadFile } from "~/utils/files";

type Props = {
  children: JSX.Element;
  format?: string;
  disabled?: boolean;
  activeClassName?: string;
  onSubmit: () => void;
};

function DropToImport({ disabled, onSubmit, children, format }: Props) {
  const { t } = useTranslation();
  const { collections } = useStores();
  const [file, setFile] = React.useState<File | null>(null);
  const [isImporting, setImporting] = React.useState(false);
  const [permission, setPermission] =
    React.useState<CollectionPermission | null>(CollectionPermission.ReadWrite);

  const handleFiles = (files: File[]) => {
    if (files.length > 1) {
      toast.error(t("Please choose a single file to import"));
      return;
    }
    setFile(files[0]);
  };

  const handleStartImport = async () => {
    if (!file) {
      return;
    }
    setImporting(true);

    try {
      const attachment = await uploadFile(file, {
        name: file.name,
        preset: AttachmentPreset.WorkspaceImport,
      });
      await collections.import(attachment.id, { format, permission });
      onSubmit();
      toast.message(file.name, {
        description: t(
          "Your import is being processed, you can safely leave this page"
        ),
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleRejection = React.useCallback(() => {
    toast.error(t("File not supported – please upload a valid ZIP file"));
  }, [t]);

  if (disabled) {
    return children;
  }

  return (
    <Flex gap={8} column>
      {isImporting && <LoadingIndicator />}
      <Text as="p" type="secondary">
        <Dropzone
          accept="application/zip, application/x-zip-compressed"
          onDropAccepted={handleFiles}
          onDropRejected={handleRejection}
          disabled={isImporting}
        >
          {({ getRootProps, getInputProps, isDragActive }) => (
            <DropzoneContainer
              {...getRootProps()}
              $disabled={isImporting}
              $isDragActive={isDragActive}
              tabIndex={-1}
            >
              <input {...getInputProps()} />
              <Flex align="center" gap={4} column>
                <Icon size={32} color="#fff" />
                {file
                  ? t(`${file.name} (${bytesToHumanReadable(file.size)})`)
                  : children}
              </Flex>
            </DropzoneContainer>
          )}
        </Dropzone>
      </Text>
      <div>
        <InputSelectPermission
          value={permission}
          onChange={(value: CollectionPermission | typeof EmptySelectValue) => {
            setPermission(value === EmptySelectValue ? null : value);
          }}
        />
        <Text as="span" type="secondary">
          {t(
            "Set the default permission level for collections created from the import"
          )}
          .
        </Text>
      </div>
      <Flex justify="flex-end">
        <Button disabled={!file} onClick={handleStartImport}>
          {t("Start import")}
        </Button>
      </Flex>
    </Flex>
  );
}

const Icon = styled(NewDocumentIcon)`
  padding: 4px;
  border-radius: 50%;
  background: ${(props) => props.theme.brand.blue};
  color: white;
`;

const DropzoneContainer = styled.div<{
  $disabled: boolean;
  $isDragActive: boolean;
}>`
  background: ${(props) =>
    props.$isDragActive
      ? props.theme.backgroundSecondary
      : props.theme.background};
  border-radius: 8px;
  border: 1px dashed ${s("divider")};
  padding: 52px;
  text-align: center;
  font-size: 15px;
  cursor: var(--pointer);
  opacity: ${(props) => (props.$disabled ? 0.5 : 1)};

  &:hover {
    background: ${s("backgroundSecondary")};
  }
`;

export default observer(DropToImport);
