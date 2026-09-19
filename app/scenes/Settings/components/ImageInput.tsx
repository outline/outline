import { EditIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { IAvatar } from "~/components/Avatar";
import { Avatar, AvatarSize } from "~/components/Avatar";
import { AvatarVariant } from "~/components/Avatar/Avatar";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import type { Props as ImageUploadProps } from "./ImageUpload";
import ImageUpload from "./ImageUpload";

type Props = ImageUploadProps & {
  /** The model whose avatar is displayed and updated by this input. */
  model: IAvatar;
  /** Alt text for the avatar image. */
  alt: string;
  /**
   * Whether to render the inline "Remove" button when the model has an
   * existing avatar. Defaults to true.
   */
  showRemoveOption?: boolean;
};

export default function ImageInput({
  model,
  onSuccess,
  alt,
  showRemoveOption = true,
  ...rest
}: Props) {
  const { t } = useTranslation();

  return (
    <Flex gap={8} justify="space-between">
      <ImageBox>
        <ImageUpload
          onSuccess={onSuccess}
          submitText={t("Crop Image")}
          {...rest}
        >
          <Avatar
            model={model}
            size={AvatarSize.Upload}
            variant={AvatarVariant.Round}
            alt={alt}
          />
          <Flex auto align="center" justify="center" className="upload">
            <EditIcon />
          </Flex>
        </ImageUpload>
      </ImageBox>
      {model.avatarUrl && showRemoveOption && (
        <Button onClick={() => onSuccess(null)} neutral>
          {t("Remove")}
        </Button>
      )}
    </Flex>
  );
}

const avatarStyles = `
  width: ${AvatarSize.Upload}px;
  height: ${AvatarSize.Upload}px;
`;

const ImageBox = styled(Flex)`
  ${avatarStyles};
  position: relative;
  font-size: 14px;
  border-radius: 50%;
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
