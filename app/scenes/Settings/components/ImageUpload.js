// @flow
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import * as React from "react";
import AvatarEditor from "react-avatar-editor";
import Dropzone from "react-dropzone";
import styled from "styled-components";
import UiStore from "stores/UiStore";
import Button from "components/Button";
import Flex from "components/Flex";
import LoadingIndicator from "components/LoadingIndicator";
import Modal from "components/Modal";
import { uploadFile, dataUrlToBlob } from "utils/uploadFile";

const EMPTY_OBJECT = {};

type Props = {
  children?: React.Node,
  onSuccess: (string) => void | Promise<void>,
  onError: (string) => void,
  submitText: string,
  borderRadius: number,
  ui: UiStore,
};

@observer
class ImageUpload extends React.Component<Props> {
  @observable isUploading: boolean = false;
  @observable isCropping: boolean = false;
  @observable zoom: number = 1;
  file: File;
  avatarEditorRef: AvatarEditor;

  static defaultProps = {
    submitText: "Crop Picture",
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
    setImmediate(this.uploadImage);
  };

  uploadImage = async () => {
    const canvas = this.avatarEditorRef.getImage();
    const imageBlob = dataUrlToBlob(canvas.toDataURL());
    try {
      const attachment = await uploadFile(imageBlob, {
        name: this.file.name,
        public: true,
      });
      this.props.onSuccess(attachment.url);
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

  handleZoom = (event: SyntheticDragEvent<*>) => {
    let target = event.target;
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
              ref={(ref) => (this.avatarEditorRef = ref)}
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
        accept="image/png, image/jpeg"
        onDropAccepted={this.onDropAccepted}
        style={EMPTY_OBJECT}
        disablePreview
      >
        {this.props.children}
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
  cursor: pointer;
  color: inherit;
  border-radius: 99999px;
  background-color: #dee1e3;
  appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: ${(props) => props.theme.text};
    cursor: pointer;
  }

  &:focus {
    outline: none;
  }
`;

const CropButton = styled(Button)`
  width: 300px;
`;

export default inject("ui")(ImageUpload);
