import copy from "copy-to-clipboard";
import { debounce, isEmpty } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { CopyIcon, GlobeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import { UrlHelper } from "@shared/utils/UrlHelper";
import type Collection from "~/models/Collection";
import type Share from "~/models/Share";
import { AvatarSize } from "~/components/Avatar";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import env from "~/env";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { ListItem } from "../components/ListItem";
import ShareSettingsPopover from "../components/ShareSettingsPopover";
import { DomainPrefix, ShareLinkInput, StyledInfoIcon } from "../components";

type Props = {
  /** The collection to share. */
  collection: Collection;
  /** The existing share model, if any. */
  share: Share | null | undefined;
};

function InnerPublicAccess(
  { collection, share }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const { t } = useTranslation();
  const { shares } = useStores();
  const theme = useTheme();
  const [validationError, setValidationError] = React.useState("");
  const [urlId, setUrlId] = React.useState(share?.urlId);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const can = usePolicy(share);
  const collectionAbilities = usePolicy(collection);
  const canPublish = share ? can.update : collectionAbilities.share;
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    setUrlId(share?.urlId);
  }, [share?.urlId]);

  const handlePublishedChange = React.useCallback(
    async (checked: boolean) => {
      try {
        if (checked && !share) {
          setCreating(true);
          const newShare = await shares.create({
            type: "collection",
            collectionId: collection.id,
            published: true,
          });
          copy(newShare.url);
          toast.success(t("Public link copied to clipboard"));
        } else if (share) {
          await share.save({ published: checked });
          if (checked) {
            copy(share.url);
            toast.success(t("Public link copied to clipboard"));
          }
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setCreating(false);
      }
    },
    [t, share, shares, collection]
  );

  const handleUrlChange = React.useMemo(
    () =>
      debounce(async (ev) => {
        if (!share) {
          return;
        }

        const val = ev.target.value;
        setUrlId(val);
        if (val && !UrlHelper.SHARE_URL_SLUG_REGEX.test(val)) {
          setValidationError(
            t("Only lowercase letters, digits and dashes allowed")
          );
        } else {
          setValidationError("");
          if (share.urlId !== val) {
            try {
              await share.save({
                urlId: isEmpty(val) ? null : val,
              });
            } catch (err) {
              if (err.message.includes("must be unique")) {
                setValidationError(t("Sorry, this link has already been used"));
              }
            }
          }
        }
      }, 500),
    [t, share]
  );

  const handleCopied = React.useCallback(() => {
    toast.success(t("Public link copied to clipboard"));
  }, [t]);

  const copyButton = (
    <Tooltip content={t("Copy public link")} placement="top">
      <CopyToClipboard text={share?.url ?? ""} onCopy={handleCopied}>
        <NudeButton type="button" disabled={!share} style={{ marginRight: 3 }}>
          <CopyIcon color={theme.placeholder} size={18} />
        </NudeButton>
      </CopyToClipboard>
    </Tooltip>
  );

  return (
    <div ref={ref}>
      <ListItem
        title={t("Publish to web")}
        subtitle={<>{t("Allow anyone with the link to access")}</>}
        image={
          <Squircle color={theme.text} size={AvatarSize.Medium}>
            <GlobeIcon color={theme.background} size={18} />
          </Squircle>
        }
        actions={
          <Switch
            aria-label={t("Publish to internet")}
            checked={share?.published ?? false}
            onChange={handlePublishedChange}
            disabled={!canPublish || creating}
            width={26}
            height={14}
          />
        }
      />

      <ResizingHeightContainer>
        {!!share?.published && (
          <>
            <Flex align="center" gap={2}>
              <ShareLinkInput
                type="text"
                ref={inputRef}
                placeholder={share?.id}
                onChange={handleUrlChange}
                error={validationError}
                defaultValue={urlId}
                prefix={
                  <DomainPrefix onClick={() => inputRef.current?.focus()}>
                    {env.URL.replace(/https?:\/\//, "") + "/s/"}
                  </DomainPrefix>
                }
              >
                {copyButton}
              </ShareLinkInput>
              <ShareSettingsPopover share={share} />
            </Flex>
            <Flex align="flex-start" gap={4}>
              <StyledInfoIcon color={theme.textTertiary} />
              <Text type="tertiary" size="xsmall">
                {t(
                  "All documents in this collection will be shared on the web, including any new documents added later"
                )}
                .
              </Text>
            </Flex>
          </>
        )}
      </ResizingHeightContainer>
    </div>
  );
}

export const PublicAccess = observer(React.forwardRef(InnerPublicAccess));
