import { observer } from "mobx-react";
import { EditIcon, ExportIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { IAvatar } from "~/components/Avatar";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { AvatarVariant } from "~/components/Avatar/Avatar";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import type {
  ImageUploadHandle,
  Props as ImageUploadProps,
} from "./ImageUpload";
import ImageUpload from "./ImageUpload";

type Props = ImageUploadProps & {
  /** The model whose avatar is displayed and updated by this input. */
  model: IAvatar;
  /** Alt text for the avatar image. */
  alt: string;
  /** The shape of the avatar preview. Defaults to round. */
  variant?: AvatarVariant;
  /**
   * Whether to render the change and remove buttons below the image. Hide
   * them when the parent provides its own controls. Defaults to true.
   */
  showActions?: boolean;
  /** Handle to open the file picker from the parent. */
  ref?: React.Ref<ImageUploadHandle>;
};

function ImageInput({
  model,
  onSuccess,
  alt,
  variant = AvatarVariant.Round,
  showActions = true,
  ref,
  ...rest
}: Props) {
  const { t } = useTranslation();
  const uploadRef = React.useRef<ImageUploadHandle>(null);

  React.useImperativeHandle(
    ref,
    () => ({ open: () => uploadRef.current?.open() }),
    []
  );

  const handleChange = React.useCallback(() => {
    uploadRef.current?.open();
  }, []);

  const handleRemove = React.useCallback(() => {
    void onSuccess(null);
  }, [onSuccess]);

  return (
    <Wrapper column align="center" gap={4}>
      <ImageBox $variant={variant}>
        <ImageUpload
          ref={uploadRef}
          onSuccess={onSuccess}
          submitText={t("Crop image")}
          {...rest}
        >
          <Avatar
            model={model}
            size={AvatarSize.Upload}
            variant={variant}
            alt={alt}
          />
          <Flex auto align="center" justify="center" className="upload">
            <ExportIcon />
          </Flex>
        </ImageUpload>
      </ImageBox>
      {showActions && (
        <Actions gap={4} justify="center">
          <Tooltip content={t("Change image")}>
            <NudeButton aria-label={t("Change image")} onClick={handleChange}>
              <EditIcon />
            </NudeButton>
          </Tooltip>
          {model.avatarUrl && (
            <Tooltip content={t("Remove image")}>
              <NudeButton aria-label={t("Remove image")} onClick={handleRemove}>
                <TrashIcon />
              </NudeButton>
            </Tooltip>
          )}
        </Actions>
      )}
    </Wrapper>
  );
}

export default observer(ImageInput);

const Wrapper = styled(Flex)`
  width: fit-content;
`;

const Actions = styled(Flex)`
  color: ${s("textSecondary")};

  button:hover,
  button:focus-visible {
    color: ${s("text")};
  }
`;

const avatarStyles = `
  width: ${AvatarSize.Upload}px;
  height: ${AvatarSize.Upload}px;
`;

const ImageBox = styled(Flex)<{ $variant: AvatarVariant }>`
  ${avatarStyles};
  position: relative;
  font-size: 14px;
  border-radius: ${(props) =>
    props.$variant === AvatarVariant.Round
      ? "50%"
      : `${AvatarSize.Upload / 8}px`};
  box-shadow: 0 0 0 1px ${s("backgroundSecondary")};
  background: ${s("background")};
  overflow: hidden;

  .upload {
    ${avatarStyles};
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    opacity: 0;
    cursor: var(--pointer);
    transition: all 250ms;
  }

  &:hover .upload {
    opacity: 1;
    background: rgba(0, 0, 0, 0.75);
    color: ${(props) => props.theme.white};
  }
`;
