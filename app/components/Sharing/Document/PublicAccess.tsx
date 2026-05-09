import copy from "copy-to-clipboard";
import { debounce, isEmpty } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { CopyIcon, GlobeIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useTheme } from "styled-components";
import Flex from "@shared/components/Flex";
import Squircle from "@shared/components/Squircle";
import { UrlHelper } from "@shared/utils/UrlHelper";
import type Document from "~/models/Document";
import type Share from "~/models/Share";
import Switch from "~/components/Switch";
import env from "~/env";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { AvatarSize } from "../../Avatar";
import CopyToClipboard from "../../CopyToClipboard";
import NudeButton from "../../NudeButton";
import { ResizingHeightContainer } from "../../ResizingHeightContainer";
import Text from "../../Text";
import Tooltip from "../../Tooltip";
import { ListItem } from "../components/ListItem";
import ShareSettingsPopover from "../components/ShareSettingsPopover";
import {
  DomainPrefix,
  ShareLinkInput,
  StyledInfoIcon,
  UnderlinedLink,
} from "../components";

type Props = {
  /** The document to share. */
  document: Document;
  /** The existing share model, if any. */
  share: Share | null | undefined;
  /** The existing share parent model, if any. */
  sharedParent: Share | null | undefined;
  /** Ref to the Copy Link button */
  copyButtonRef?: React.RefObject<HTMLButtonElement>;
  onRequestClose?: () => void;
};

function PublicAccess(
  { document, share, sharedParent }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const { t } = useTranslation();
  const { shares } = useStores();
  const theme = useTheme();
  const [validationError, setValidationError] = React.useState("");
  const [urlId, setUrlId] = React.useState(share?.urlId);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const can = usePolicy(share);
  const documentAbilities = usePolicy(document);
  const canPublish = share ? can.update : documentAbilities.share;
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
            type: "document",
            documentId: document.id,
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
    [t, share, shares, document]
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

  const shareUrl =
    sharedParent?.url && !document.isDraft
      ? `${sharedParent.url}${document.url}`
      : (share?.url ?? "");

  const copyButton = (
    <Tooltip content={t("Copy public link")} placement="top">
      <CopyToClipboard text={shareUrl} onCopy={handleCopied}>
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
        subtitle={
          <>
            {sharedParent && !document.isDraft ? (
              sharedParent.collectionId ? (
                <Trans>
                  Anyone with the link can access because the containing
                  collection,{" "}
                  <UnderlinedLink
                    to={`/collection/${sharedParent.collectionId}`}
                  >
                    {sharedParent.sourceTitle}
                  </UnderlinedLink>
                  , is shared
                </Trans>
              ) : (
                <Trans>
                  Anyone with the link can access because the parent document,{" "}
                  <UnderlinedLink to={`/doc/${sharedParent.documentId}`}>
                    {sharedParent.sourceTitle}
                  </UnderlinedLink>
                  , is shared
                </Trans>
              )
            ) : (
              t("Allow anyone with the link to access")
            )}
          </>
        }
        image={
          <Squircle color={theme.text} size={AvatarSize.Medium}>
            <GlobeIcon color={theme.background} size={18} />
          </Squircle>
        }
        actions={
          sharedParent && !document.isDraft ? null : (
            <Switch
              aria-label={t("Publish to internet")}
              checked={share?.published ?? false}
              onChange={handlePublishedChange}
              disabled={!canPublish || creating}
              width={26}
              height={14}
            />
          )
        }
      />

      <ResizingHeightContainer>
        {sharedParent?.published && !document.isDraft ? (
          <ShareLinkInput type="text" disabled defaultValue={shareUrl}>
            {copyButton}
          </ShareLinkInput>
        ) : share?.published ? (
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
        ) : null}

        {share?.published && !share.includeChildDocuments ? (
          <Text as="p" type="tertiary" size="xsmall">
            <StyledInfoIcon color={theme.textTertiary} />
            <span>
              {t(
                "Nested documents are not shared on the web. Toggle sharing to enable access, this will be the default behavior in the future"
              )}
              .
            </span>
          </Text>
        ) : null}
      </ResizingHeightContainer>
    </div>
  );
}

export default observer(React.forwardRef(PublicAccess));
