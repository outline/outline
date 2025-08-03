import debounce from "lodash/debounce";
import isEmpty from "lodash/isEmpty";
import { observer } from "mobx-react";
import { CopyIcon, GlobeIcon, InfoIcon, QuestionMarkIcon } from "outline-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";
import Squircle from "@shared/components/Squircle";
import { s } from "@shared/styles";
import { UrlHelper } from "@shared/utils/UrlHelper";
import Collection from "~/models/Collection";
import Share from "~/models/Share";
import { AvatarSize } from "~/components/Avatar";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import Input, { NativeInput } from "~/components/Input";
import NudeButton from "~/components/NudeButton";
import { ResizingHeightContainer } from "~/components/ResizingHeightContainer";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import env from "~/env";
import usePolicy from "~/hooks/usePolicy";
import { ListItem } from "../components/ListItem";

type Props = {
  /** The collection to share. */
  collection: Collection;
  /** The existing share model, if any. */
  share: Share | null | undefined;
};

function InnerPublicAccess({ collection, share }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [validationError, setValidationError] = useState("");
  const [urlId, setUrlId] = useState(share?.urlId);
  const inputRef = useRef<HTMLInputElement>(null);
  const can = usePolicy(share);
  const collectionAbilities = usePolicy(collection);
  const canPublish = can.update && collectionAbilities.share;

  useEffect(() => {
    setUrlId(share?.urlId);
  }, [share?.urlId]);

  const handleIndexingChanged = useCallback(
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

  const handleShowLastModifiedChanged = useCallback(
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

  const handlePublishedChange = useCallback(
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

  const handleUrlChange = useMemo(
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

  const handleCopied = useCallback(() => {
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
    <Wrapper>
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
              <StyledInfoIcon size={18} color={theme.textTertiary} />
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
    </Wrapper>
  );
}

const Wrapper = styled.div`
  padding-bottom: 8px;
`;

const DomainPrefix = styled.span`
  padding: 0 2px 0 8px;
  flex: 0 1 auto;
  cursor: text;
  color: ${s("placeholder")};
  user-select: none;
`;

const ShareLinkInput = styled(Input)`
  margin-top: 12px;
  min-width: 100px;
  flex: 1;

  ${NativeInput}:not(:first-child) {
    padding: 4px 8px 4px 0;
    flex: 1;
  }
`;

const StyledInfoIcon = styled(InfoIcon)`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

export const PublicAccess = observer(InnerPublicAccess);
