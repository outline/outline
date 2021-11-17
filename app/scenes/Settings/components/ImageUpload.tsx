import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import AvatarEditor from "react-avatar-editor";
import Dropzone from "react-dropzone";
import styled from "styled-components";
import UiStore from "stores/UiStore";
import Button from "components/Button";
import Flex from "components/Flex";
import LoadingIndicator from "components/LoadingIndicator";
import Modal from "components/Modal";
import withStores from "components/withStores";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/compressImage' or its co... Remove this comment to see the full error message
import { compressImage } from "utils/compressImage";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/uploadFile' or its corre... Remove this comment to see the full error message
import { uploadFile, dataUrlToBlob } from "utils/uploadFile";

const EMPTY_OBJECT = {};

type StoreProps = {
  ui: UiStore;
};

type Props = {
  children?: React.ReactNode;
  onSuccess: (arg0: string) => void | Promise<void>;
  onError: (arg0: string) => void;
  submitText?: string;
  borderRadius?: number;
};

@observer
class ImageUpload extends React.Component<Props & StoreProps> {
  @observable
  isUploading = false;

  @observable
  isCropping = false;

  @observable
  zoom = 1;

  @observable
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
      const compressed = await compressImage(imageBlob, {
        maxHeight: 512,
        maxWidth: 512,
      });
      const attachment = await uploadFile(compressed, {
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

  handleZoom = (event: React.DragEvent<any>) => {
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
              // @ts-expect-error ts-migrate(7006) FIXME: Parameter 'ref' implicitly has an 'any' type.
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
            // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
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
        // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: ({ getRootProps, getInputProps }... Remove this comment to see the full error message
        style={EMPTY_OBJECT}
        disablePreview
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

export default withStores<Props>(ImageUpload);
