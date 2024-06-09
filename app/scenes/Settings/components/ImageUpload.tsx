import invariant from "invariant";
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import AvatarEditor from "react-avatar-editor";
import Dropzone from "react-dropzone";
import styled from "styled-components";
import { s } from "@shared/styles";
import { AttachmentPreset } from "@shared/types";
import { AttachmentValidation } from "@shared/validations";
import RootStore from "~/stores/RootStore";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import LoadingIndicator from "~/components/LoadingIndicator";
import Modal from "~/components/Modal";
import withStores from "~/components/withStores";
import { compressImage } from "~/utils/compressImage";
import { uploadFile, dataUrlToBlob } from "~/utils/files";

export type Props = {
  onSuccess: (url: string | null) => void | Promise<void>;
  onError: (error: string) => void;
  submitText?: string;
  borderRadius?: number;
};

@observer
class ImageUpload extends React.Component<RootStore & Props> {
  @observable
  isUploading = false;

  @observable
  isCropping = false;

  @observable
  zoom = 1;

  @observable
  file: File;

  avatarEditorRef = React.createRef<AvatarEditor>();

  static defaultProps = {
    submitText: "Crop Image",
    borderRadius: 150,
  };

  onDropAccepted = async (files: File[]) => {
    this.isCropping = true;
    this.file = files[0];
  };

  handleCrop = () => {
    this.isUploading = true;
    // allow the UI to update before converting the canvas to a Blob
    // for large images this can cause the page rendering to hang.
    setTimeout(this.uploadImage, 0);
  };

  uploadImage = async () => {
    const canvas = this.avatarEditorRef.current?.getImage();
    invariant(canvas, "canvas is not defined");
    const imageBlob = dataUrlToBlob(canvas.toDataURL());

    try {
      const compressed = await compressImage(imageBlob, {
        maxHeight: 512,
        maxWidth: 512,
      });
      const attachment = await uploadFile(compressed, {
        name: this.file.name,
        preset: AttachmentPreset.Avatar,
      });
      void this.props.onSuccess(attachment.url);
    } catch (err) {
      this.props.onError(err.message);
    } finally {
      this.isUploading = false;
      this.isCropping = false;
    }
  };

  handleClose = () => {
    this.isUploading = false;
    this.isCropping = false;
  };

  handleZoom = (event: React.ChangeEvent<HTMLInputElement>) => {
    const target = event.target;

    if (target instanceof HTMLInputElement) {
      this.zoom = parseFloat(target.value);
    }
  };

  renderCropping() {
    const { ui, submitText } = this.props;
    return (
      <Modal isOpen onRequestClose={this.handleClose} title="">
        <Flex auto column align="center" justify="center">
          {this.isUploading && <LoadingIndicator />}
          <AvatarEditorContainer>
            <AvatarEditor
              ref={this.avatarEditorRef}
              image={this.file}
              width={250}
              height={250}
              border={25}
              borderRadius={this.props.borderRadius}
              color={
                ui.theme === "light" ? [255, 255, 255, 0.6] : [0, 0, 0, 0.6]
              } // RGBA
              scale={this.zoom}
              rotate={0}
            />
          </AvatarEditorContainer>
          <RangeInput
            type="range"
            min="0.1"
            max="2"
            step="0.01"
            defaultValue="1"
            onChange={this.handleZoom}
          />
          <CropButton onClick={this.handleCrop} disabled={this.isUploading}>
            {this.isUploading ? "Uploading…" : submitText}
          </CropButton>
        </Flex>
      </Modal>
    );
  }

  render() {
    if (this.isCropping) {
      return this.renderCropping();
    }

    return (
      <Dropzone
        accept={AttachmentValidation.avatarContentTypes.join(", ")}
        onDropAccepted={this.onDropAccepted}
      >
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            {this.props.children}
          </div>
        )}
      </Dropzone>
    );
  }
}

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

const CropButton = styled(Button)`
  width: 300px;
`;

export default withStores(ImageUpload);
