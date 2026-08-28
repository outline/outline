import invariant from "invariant";
import { observer } from "mobx-react";
import * as React from "react";
import { useState, useRef } from "react";
import AvatarEditor from "react-avatar-editor";
import { useDropzone } from "react-dropzone";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { errToString } from "@shared/utils/error";
import { s } from "@shared/styles";
import { AttachmentPreset } from "@shared/types";
import { AttachmentValidation } from "@shared/validations";
import ButtonLarge from "~/components/ButtonLarge";
import Flex from "~/components/Flex";
import LoadingIndicator from "~/components/LoadingIndicator";
import useStores from "~/hooks/useStores";
import { uploadFile, dataUrlToBlob } from "~/utils/files";
import { ImageHelper } from "~/utils/ImageHelper";

export type Props = {
  onSuccess: (url: string | null) => void | Promise<void>;
  onError: (error: string) => void;
  submitText?: string;
  borderRadius?: number;
};

const ImageUpload: React.FC<Props> = ({
  onSuccess,
  onError,
  submitText,
  borderRadius,
  children,
}) => {
  const { dialogs } = useStores();
  const { t } = useTranslation();

  const [isCropping, setIsCropping] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const uploadImage = React.useCallback(
    async (blob: Blob, file: File) => {
      try {
        const compressed = await ImageHelper.compress(blob, {
          maxHeight: 512,
          maxWidth: 512,
        });
        const attachment = await uploadFile(compressed, {
          name: file.name,
          preset: AttachmentPreset.Avatar,
        });
        void onSuccess(attachment.url);
      } catch (err) {
        onError(errToString(err));
      } finally {
        setIsCropping(false);
        dialogs.closeAllModals();
      }
    },
    [dialogs, onSuccess, onError]
  );

  const handleUpload = React.useCallback(
    (blob: Blob, file: File) => {
      void uploadImage(blob, file);
    },
    [uploadImage]
  );

  const handleClose = React.useCallback(() => {
    setIsCropping(false);
  }, []);

  const onDropAccepted = React.useCallback(
    async (files: File[]) => {
      let file = files[0];

      // Most browsers cannot display HEIC images, so convert to JPEG before
      // the image is shown in the cropper.
      if (ImageHelper.isHeic(file)) {
        setIsConverting(true);
        const converted = await ImageHelper.convertHeicToJpeg(file);
        setIsConverting(false);

        if (!converted) {
          onError(
            t(
              "Your browser cannot read HEIC images, please convert it to JPEG or PNG first"
            )
          );
          return;
        }
        file = converted;
      }

      setIsCropping(true);
      dialogs.openModal({
        title: "",
        content: (
          <AvatarEditorDialog
            file={file}
            onUpload={handleUpload}
            borderRadius={borderRadius ?? 150}
            submitText={submitText || t("Crop image")}
          />
        ),
        onClose: handleClose,
      });
    },
    [t, dialogs, handleUpload, handleClose, onError, borderRadius, submitText]
  );

  const { getRootProps, getInputProps } = useDropzone({
    accept: AttachmentValidation.avatarInputContentTypes.join(", "),
    onDropAccepted,
  });

  if (isCropping) {
    return null; // onDropAccepted would have opened a modal for cropping the image.
  }

  return (
    <div {...getRootProps()}>
      {isConverting && <LoadingIndicator />}
      <input {...getInputProps()} />
      {children}
    </div>
  );
};

type AvatarEditorDialogProps = {
  file: File;
  onUpload: (blob: Blob, file: File) => void;
  borderRadius: number;
  submitText: string;
};

const AvatarEditorDialog: React.FC<AvatarEditorDialogProps> = observer(
  ({ file, onUpload, borderRadius, submitText }) => {
    const { ui } = useStores();
    const { t } = useTranslation();
    const [zoom, setZoom] = useState(1);
    const [isUploading, setIsUploading] = useState(false);
    const avatarEditorRef = useRef<AvatarEditor>(null);

    const handleUpload = React.useCallback(() => {
      setIsUploading(true);
      // Allow the button to render as disabled before the canvas is converted,
      // which hangs rendering for large images.
      setTimeout(() => {
        const canvas = avatarEditorRef.current?.getImage();
        invariant(canvas, "canvas is not defined");
        onUpload(dataUrlToBlob(canvas.toDataURL()), file);
      }, 0);
    }, [file, onUpload]);

    const handleZoom = React.useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const target = event.target;

        if (target instanceof HTMLInputElement) {
          setZoom(parseFloat(target.value));
        }
      },
      []
    );

    return (
      <Flex auto column align="center" justify="center">
        {isUploading && <LoadingIndicator />}
        <AvatarEditorContainer>
          <AvatarEditor
            ref={avatarEditorRef}
            image={file}
            width={250}
            height={250}
            border={25}
            borderRadius={borderRadius}
            color={ui.theme === "light" ? [255, 255, 255, 0.6] : [0, 0, 0, 0.6]} // RGBA
            scale={zoom}
            rotate={0}
          />
        </AvatarEditorContainer>
        <RangeInput
          type="range"
          min="0.1"
          max="2"
          step="0.01"
          defaultValue="1"
          onChange={handleZoom}
        />
        <br />
        <ButtonLarge fullwidth onClick={handleUpload} disabled={isUploading}>
          {isUploading ? `${t(`Uploading`)}…` : submitText}
        </ButtonLarge>
      </Flex>
    );
  }
);

const AvatarEditorContainer = styled(Flex)`
  margin-bottom: 30px;
`;

const RangeInput = styled.input`
  display: block;
  width: 300px;
  margin-bottom: 30px;
  height: 4px;
  cursor: var(--pointer);
  color: inherit;
  border-radius: 99999px;
  background-color: #dee1e3;
  appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: ${s("text")};
    cursor: var(--pointer);
  }

  &:focus {
    outline: none;
  }
`;

export default observer(ImageUpload);
