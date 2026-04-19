import debounce from "lodash/debounce";
import { observer } from "mobx-react";
import { QuestionMarkIcon, SettingsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";
import Flex from "@shared/components/Flex";
import { s } from "@shared/styles";
import { AttachmentPreset } from "@shared/types";
import { AttachmentValidation } from "@shared/validations";
import type Share from "~/models/Share";
import Input from "~/components/Input";
import NudeButton from "~/components/NudeButton";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { compressImage } from "~/utils/compressImage";
import { uploadFile } from "~/utils/files";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import { ListItem } from "./ListItem";

type Props = {
  /** The share model to configure settings for. */
  share: Share;
  /** Custom trigger element. If not provided, a default settings icon button is rendered. */
  children?: React.ReactElement;
};

/**
 * A popover triggered by a settings icon that contains toggle options
 * for configuring a published share link (indexing, subscriptions, etc.),
 * as well as custom title and logo branding.
 */
function ShareSettingsPopover({ share, children }: Props) {
  const { t } = useTranslation();
  const { auth } = useStores();
  const theme = useTheme();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const handleTitleChange = React.useMemo(
    () =>
      debounce(async (ev: React.ChangeEvent<HTMLInputElement>) => {
        const val = ev.target.value;
        try {
          await share.save({ title: val || null });
        } catch (err) {
          toast.error(err.message);
        }
      }, 500),
    [share]
  );

  const handleLogoUpload = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const file = ev.target.files?.[0];
      if (!file) {
        return;
      }

      setIsUploading(true);
      try {
        const compressed = await compressImage(file, {
          maxHeight: 512,
          maxWidth: 512,
        });
        const attachment = await uploadFile(compressed, {
          name: file.name,
          preset: AttachmentPreset.Avatar,
        });
        await share.save({ iconUrl: attachment.url });
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [share]
  );

  const handleLogoRemove = React.useCallback(async () => {
    try {
      await share.save({ iconUrl: null });
    } catch (err) {
      toast.error(err.message);
    }
  }, [share]);

  const handleIndexingChanged = React.useCallback(
    async (checked: boolean) => {
      try {
        await share.save({ allowIndexing: checked });
      } catch (err) {
        toast.error(err.message);
      }
    },
    [share]
  );

  const handleSubscriptionsChanged = React.useCallback(
    async (checked: boolean) => {
      try {
        await share.save({ allowSubscriptions: checked });
      } catch (err) {
        toast.error(err.message);
      }
    },
    [share]
  );

  const handleShowLastModifiedChanged = React.useCallback(
    async (checked: boolean) => {
      try {
        await share.save({ showLastUpdated: checked });
      } catch (err) {
        toast.error(err.message);
      }
    },
    [share]
  );

  const handleShowTOCChanged = React.useCallback(
    async (checked: boolean) => {
      try {
        await share.save({ showTOC: checked });
      } catch (err) {
        toast.error(err.message);
      }
    },
    [share]
  );

  return (
    <Popover>
      {children ? (
        <PopoverTrigger>{children}</PopoverTrigger>
      ) : (
        <Tooltip content={t("Display settings")} placement="top">
          <PopoverTrigger>
            <SettingsTrigger type="button">
              <SettingsIcon color={theme.placeholder} size={24} />
            </SettingsTrigger>
          </PopoverTrigger>
        </Tooltip>
      )}
      <PopoverContent side="bottom" align="end" width={320}>
        <Text as="h3" type="secondary" size="small" weight="bold">
          {t("Display settings")}
        </Text>
        <Input
          type="text"
          label={t("Site title")}
          placeholder={auth.team?.name ?? ""}
          defaultValue={share.title ?? ""}
          onChange={handleTitleChange}
          short
        />
        <Flex align="center" gap={8} style={{ margin: "8px 0" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept={AttachmentValidation.avatarContentTypes.join(",")}
            onChange={handleLogoUpload}
            style={{ display: "none" }}
          />
          {share.iconUrl ? (
            <>
              <LogoPreview src={share.iconUrl} alt="" />
              <Flex column gap={2} style={{ flex: 1 }}>
                <Text type="secondary" size="small">
                  {t("Icon")}
                </Text>
                <Flex gap={4}>
                  <TextButton
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {t("Replace")}
                  </TextButton>
                  <TextButton onClick={handleLogoRemove}>
                    {t("Remove")}
                  </TextButton>
                </Flex>
              </Flex>
            </>
          ) : (
            <TextButton
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? `${t("Uploading")}…` : t("Upload logo")}
            </TextButton>
          )}
        </Flex>
        <ListItem
          title={
            <Text type="tertiary" as={Flex}>
              {t("Search engine indexing")}&nbsp;
              <Tooltip
                content={t(
                  "Disable this setting to discourage search engines from indexing the page"
                )}
              >
                <NudeButton size={18}>
                  <QuestionMarkIcon size={18} />
                </NudeButton>
              </Tooltip>
            </Text>
          }
          actions={
            <Switch
              aria-label={t("Search engine indexing")}
              checked={share.allowIndexing ?? false}
              onChange={handleIndexingChanged}
              width={26}
              height={14}
            />
          }
        />
        {env.EMAIL_ENABLED && (
          <ListItem
            title={
              <Text type="tertiary" as={Flex}>
                {t("Email subscriptions")}&nbsp;
                <Tooltip
                  content={t(
                    "Allow viewers to subscribe and receive email notifications when documents are updated"
                  )}
                >
                  <NudeButton size={18}>
                    <QuestionMarkIcon size={18} />
                  </NudeButton>
                </Tooltip>
              </Text>
            }
            actions={
              <Switch
                aria-label={t("Email subscriptions")}
                checked={share.allowSubscriptions ?? true}
                onChange={handleSubscriptionsChanged}
                width={26}
                height={14}
              />
            }
          />
        )}
        <ListItem
          title={
            <Text type="tertiary" as={Flex}>
              {t("Show last modified")}&nbsp;
              <Tooltip
                content={t(
                  "Display the last modified timestamp on the shared page"
                )}
              >
                <NudeButton size={18}>
                  <QuestionMarkIcon size={18} />
                </NudeButton>
              </Tooltip>
            </Text>
          }
          actions={
            <Switch
              aria-label={t("Show last modified")}
              checked={share.showLastUpdated ?? false}
              onChange={handleShowLastModifiedChanged}
              width={26}
              height={14}
            />
          }
        />
        <ListItem
          title={
            <Text type="tertiary" as={Flex}>
              {t("Show table of contents")}&nbsp;
              <Tooltip
                content={t(
                  "Display the table of contents on documents by default"
                )}
              >
                <NudeButton size={18}>
                  <QuestionMarkIcon size={18} />
                </NudeButton>
              </Tooltip>
            </Text>
          }
          actions={
            <Switch
              aria-label={t("Show table of contents")}
              checked={share.showTOC ?? false}
              onChange={handleShowTOCChanged}
              width={26}
              height={14}
            />
          }
        />
      </PopoverContent>
    </Popover>
  );
}

const SettingsTrigger = styled(NudeButton)`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  position: relative;
  top: -2px;
  right: -4px;
`;

const LogoPreview = styled.img`
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 4px;
`;

const TextButton = styled.button`
  background: none;
  border: none;
  padding: 0;
  color: ${s("accent")};
  cursor: var(--pointer);
  font-size: 13px;

  &:hover {
    text-decoration: underline;
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

export default observer(ShareSettingsPopover);
