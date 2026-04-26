import debounce from "lodash/debounce";
import uniqueId from "lodash/uniqueId";
import { observer } from "mobx-react";
import { QuestionMarkIcon, SettingsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";
import { s } from "@shared/styles";
import { HStack } from "~/components/primitives/HStack";
import { AttachmentPreset } from "@shared/types";
import { AttachmentValidation } from "@shared/validations";
import type Share from "~/models/Share";
import { AvatarSize } from "~/components/Avatar";
import ButtonSmall from "~/components/ButtonSmall";
import Input from "~/components/Input";
import NudeButton from "~/components/NudeButton";
import Switch from "~/components/Switch";
import TeamLogo from "~/components/TeamLogo";
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
  const hasChangesRef = React.useRef(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const idPrefix = React.useMemo(() => uniqueId("share-settings-"), []);
  const showLastUpdatedId = `${idPrefix}-show-last-updated`;
  const showTOCId = `${idPrefix}-show-toc`;
  const indexingId = `${idPrefix}-indexing`;
  const subscriptionsId = `${idPrefix}-subscriptions`;

  const handleTitleChange = React.useMemo(
    () =>
      debounce(async (ev: React.ChangeEvent<HTMLInputElement>) => {
        const val = ev.target.value;
        try {
          await share.save({ title: val || null });
          hasChangesRef.current = true;
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
        hasChangesRef.current = true;
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
      hasChangesRef.current = true;
    } catch (err) {
      toast.error(err.message);
    }
  }, [share]);

  const handleIndexingChanged = React.useCallback(
    async (checked: boolean) => {
      try {
        await share.save({ allowIndexing: checked });
        hasChangesRef.current = true;
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
        hasChangesRef.current = true;
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
        hasChangesRef.current = true;
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
        hasChangesRef.current = true;
      } catch (err) {
        toast.error(err.message);
      }
    },
    [share]
  );

  const flushChangeToast = React.useCallback(() => {
    if (hasChangesRef.current) {
      toast.success(t("Sharing settings updated"));
      hasChangesRef.current = false;
    }
  }, [t]);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        flushChangeToast();
      }
    },
    [flushChangeToast]
  );

  // Also flush on unmount in case the parent popover closes us before
  // onOpenChange fires.
  React.useEffect(
    () => () => {
      flushChangeToast();
    },
    [flushChangeToast]
  );

  return (
    <Popover modal onOpenChange={handleOpenChange}>
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
      <PopoverContent
        side="bottom"
        align="end"
        minWidth={400}
        style={{ paddingTop: 20, paddingBottom: 20 }}
      >
        <Text as="h3" weight="bold">
          {t("Display settings")}
        </Text>
        <Text as="p" size="small" type="secondary">
          {t("Customize how the published document is displayed")}
        </Text>
        <input
          ref={fileInputRef}
          type="file"
          accept={AttachmentValidation.avatarContentTypes.join(",")}
          onChange={handleLogoUpload}
          style={{ display: "none" }}
        />
        <HStack spacing={8} style={{ marginBottom: 8 }}>
          <LogoButton
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            aria-label={share.iconUrl ? t("Replace") : t("Upload")}
          >
            <TeamLogo
              model={share.iconUrl ? undefined : (auth.team ?? undefined)}
              src={share.iconUrl ?? undefined}
              size={AvatarSize.Large}
              alt={t("Icon")}
            />
          </LogoButton>
          <Input
            type="text"
            label={t("Site title")}
            labelHidden
            placeholder={auth.team?.name ?? ""}
            defaultValue={share.title ?? ""}
            onChange={handleTitleChange}
            margin={0}
            flex
          />
        </HStack>
        {share.iconUrl && (
          <ButtonSmall onClick={handleLogoRemove} neutral>
            {t("Remove icon")}
          </ButtonSmall>
        )}
        <ListItem
          title={
            <SwitchLabel htmlFor={showLastUpdatedId}>
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
            </SwitchLabel>
          }
          actions={
            <Switch
              id={showLastUpdatedId}
              checked={share.showLastUpdated ?? false}
              onChange={handleShowLastModifiedChanged}
              width={26}
              height={14}
            />
          }
        />
        <ListItem
          title={
            <SwitchLabel htmlFor={showTOCId}>
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
            </SwitchLabel>
          }
          actions={
            <Switch
              id={showTOCId}
              checked={share.showTOC ?? false}
              onChange={handleShowTOCChanged}
              width={26}
              height={14}
            />
          }
        />
        <Text as="h3" weight="bold" style={{ marginTop: 16 }}>
          {t("Behavior")}
        </Text>
        <ListItem
          title={
            <SwitchLabel htmlFor={indexingId}>
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
            </SwitchLabel>
          }
          actions={
            <Switch
              id={indexingId}
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
              <SwitchLabel htmlFor={subscriptionsId}>
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
              </SwitchLabel>
            }
            actions={
              <Switch
                id={subscriptionsId}
                checked={share.allowSubscriptions ?? true}
                onChange={handleSubscriptionsChanged}
                width={26}
                height={14}
              />
            }
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

const SwitchLabel = styled.label`
  display: flex;
  align-items: center;
  color: ${s("textSecondary")};
  cursor: var(--pointer);
`;

const SettingsTrigger = styled(NudeButton)`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  position: relative;
  top: -2px;
  right: -4px;
`;

const LogoButton = styled.button`
  background: none;
  border: 0;
  padding: 0;
  cursor: var(--pointer);
  flex-shrink: 0;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

export default observer(ShareSettingsPopover);
