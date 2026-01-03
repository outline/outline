import debounce from "lodash/debounce";
import isEmpty from "lodash/isEmpty";
import { observer } from "mobx-react";
import { CopyIcon, GlobeIcon, QuestionMarkIcon } from "outline-icons";
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
import { ListItem } from "../components/ListItem";
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
  const theme = useTheme();
  const [validationError, setValidationError] = React.useState("");
  const [urlId, setUrlId] = React.useState(share?.urlId);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const can = usePolicy(share);
  const collectionAbilities = usePolicy(collection);
  const canPublish = can.update && collectionAbilities.share;

  React.useEffect(() => {
    setUrlId(share?.urlId);
  }, [share?.urlId]);

  const handleIndexingChanged = React.useCallback(
    async (checked: boolean) => {
      try {
        await share?.save({
          allowIndexing: checked,
        });
      } catch (err) {
        toast.error(err.message);
      }
    },
    [share]
  );

  const handleShowLastModifiedChanged = React.useCallback(
    async (checked: boolean) => {
      try {
        await share?.save({
          showLastUpdated: checked,
        });
      } catch (err) {
        toast.error(err.message);
      }
    },
    [share]
  );

  const handleShowTOCChanged = React.useCallback(
    async (checked: boolean) => {
      try {
        await share?.save({
          showTOC: checked,
        });
      } catch (err) {
        toast.error(err.message);
      }
    },
    [share]
  );

  const handlePublishedChange = React.useCallback(
    async (checked: boolean) => {
      try {
        await share?.save({
          published: checked,
        });
      } catch (err) {
        toast.error(err.message);
      }
    },
    [share]
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
        title={t("Web")}
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
            disabled={!canPublish}
            width={26}
            height={14}
          />
        }
      />

      <ResizingHeightContainer>
        {!!share?.published && (
          <>
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
                  checked={share?.allowIndexing ?? false}
                  onChange={handleIndexingChanged}
                  width={26}
                  height={14}
                />
              }
            />
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
                  checked={share?.showLastUpdated ?? false}
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
                  checked={share?.showTOC ?? false}
                  onChange={handleShowTOCChanged}
                  width={26}
                  height={14}
                />
              }
            />
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
