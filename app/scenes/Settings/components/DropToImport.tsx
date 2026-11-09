import { observer } from "mobx-react";
import { NewDocumentIcon } from "outline-icons";
import { useState, useCallback } from "react";
import Dropzone from "react-dropzone";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { errToString } from "@shared/utils/error";
import {
  AttachmentPreset,
  CollectionPermission,
  type ImportableIntegrationService,
} from "@shared/types";
import { bytesToHumanReadable } from "@shared/utils/files";
import {
  DropzoneContainer,
  dropzoneIcon,
} from "~/components/DropzoneContainer";
import Flex from "~/components/Flex";
import LoadingIndicator from "~/components/LoadingIndicator";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { uploadFile } from "~/utils/files";
import type { ImportOptions } from "./ImportSteps";
import { ImportSteps } from "./ImportSteps";

type Props = {
  children: React.JSX.Element;
  /** Explains what the file should contain, shown above the dropzone. */
  description?: React.ReactNode;
  /** The importable service to create an import for. */
  service: ImportableIntegrationService;
  disabled?: boolean;
  activeClassName?: string;
  onSubmit: () => void;
};

function DropToImport({
  disabled,
  onSubmit,
  children,
  description,
  service,
}: Props) {
  const { t } = useTranslation();
  const { imports } = useStores();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFiles = (files: File[]) => {
    if (files.length > 1) {
      toast.error(t("Please choose a single file to import"));
      return;
    }
    setFile(files[0]);
  };

  const handleStartImport = async ({
    destination,
    permission,
  }: ImportOptions) => {
    if (!file) {
      return;
    }
    setImporting(true);
    setUploadProgress(0);

    try {
      const attachment = await uploadFile(file, {
        name: file.name,
        preset: AttachmentPreset.WorkspaceImport,
        onProgress: (progress) => setUploadProgress(progress),
      });

      await imports.create(
        { service },
        {
          attachmentId: attachment.id,
          permission,
          ...destination,
        }
      );

      onSubmit();
      toast.message(file.name, {
        description: t(
          "Your import is being processed – you can safely leave this page"
        ),
      });
    } catch (err) {
      toast.error(errToString(err));
    } finally {
      setImporting(false);
      setUploadProgress(0);
    }
  };

  const handleRejection = useCallback(() => {
    toast.error(t("File not supported – please upload a valid ZIP file"));
  }, [t]);

  if (disabled) {
    return children;
  }

  return (
    <>
      {isImporting && <LoadingIndicator />}
      <ImportSteps
        upload={
          <>
            {description}
            <DropzoneText as="div" type="secondary">
              <Dropzone
                accept={zipAccept}
                onDropAccepted={handleFiles}
                onDropRejected={handleRejection}
                disabled={isImporting}
              >
                {({ getRootProps, getInputProps, isDragActive }) => (
                  <Container
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
                  </Container>
                )}
              </Dropzone>
            </DropzoneText>
          </>
        }
        canContinue={!!file}
        defaultPermission={CollectionPermission.ReadWrite}
        isSubmitting={isImporting}
        submittingLabel={t("Uploading {{progress}}%", {
          progress: Math.min(99, Math.floor(uploadProgress * 100)),
        })}
        onStart={handleStartImport}
      />
    </>
  );
}

const zipAccept = {
  "application/zip": [],
  "application/x-zip-compressed": [],
};

const Icon = styled(NewDocumentIcon)`
  ${dropzoneIcon}
`;

const DropzoneText = styled(Text)`
  display: flex;
  flex: 1;
  margin-bottom: 12px;
`;

const Container = styled(DropzoneContainer)`
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 52px;
`;

export default observer(DropToImport);
