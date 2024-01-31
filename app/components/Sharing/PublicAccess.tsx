import invariant from "invariant";
import debounce from "lodash/debounce";
import isEmpty from "lodash/isEmpty";
import { observer } from "mobx-react";
import { CopyIcon, GlobeIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import styled, { useTheme } from "styled-components";
import { s } from "@shared/styles";
import { SHARE_URL_SLUG_REGEX } from "@shared/utils/urlHelpers";
import Document from "~/models/Document";
import Share from "~/models/Share";
import Input, { NativeInput } from "~/components/Input";
import Switch from "~/components/Switch";
import env from "~/env";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { AvatarSize } from "../Avatar/Avatar";
import CopyToClipboard from "../CopyToClipboard";
import NudeButton from "../NudeButton";
import { ResizingHeightContainer } from "../ResizingHeightContainer";
import Squircle from "../Squircle";
import Tooltip from "../Tooltip";
import { StyledListItem } from "./MemberListItem";

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

function PublicAccess({ document, share, sharedParent }: Props) {
  const { shares } = useStores();
  const { t } = useTranslation();
  const theme = useTheme();
  const [slugValidationError, setSlugValidationError] = React.useState("");
  const [urlSlug, setUrlSlug] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const can = usePolicy(share);
  const documentAbilities = usePolicy(document);
  const canPublish = can.update && documentAbilities.share;

  const handlePublishedChange = React.useCallback(
    async (event) => {
      const share = shares.getByDocumentId(document.id);
      invariant(share, "Share must exist");

      try {
        await share.save({
          published: event.currentTarget.checked,
        });
      } catch (err) {
        toast.error(err.message);
      }
    },
    [document.id, shares]
  );

  const handleUrlSlugChange = React.useMemo(
    () =>
      debounce(async (ev) => {
        if (!share) {
          return;
        }

        const val = ev.target.value;
        setUrlSlug(val);
        if (val && !SHARE_URL_SLUG_REGEX.test(val)) {
          setSlugValidationError(
            t("Only lowercase letters, digits and dashes allowed")
          );
        } else {
          setSlugValidationError("");
          if (share.urlId !== val) {
            try {
              await share.save({
                urlId: isEmpty(val) ? null : val,
              });
            } catch (err) {
              if (err.message.includes("must be unique")) {
                setSlugValidationError(
                  t("Sorry, this link has already been used")
                );
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

  const documentTitle = sharedParent?.documentTitle;

  const shareUrl = sharedParent?.url
    ? `${sharedParent.url}${document.url}`
    : share?.url ?? "";

  const copyButton = (
    <Tooltip tooltip={t("Copy public link")} delay={500} placement="top">
      <CopyToClipboard text={shareUrl} onCopy={handleCopied}>
        <NudeButton type="button" disabled={!share} style={{ marginRight: 3 }}>
          <CopyIcon color={theme.placeholder} size={18} />
        </NudeButton>
      </CopyToClipboard>
    </Tooltip>
  );

  return (
    <Wrapper>
      <StyledListItem
        title={t("Web")}
        subtitle={
          <>
            {sharedParent && !document.isDraft ? (
              <Trans>
                Anyone with the link can access because the parent document,{" "}
                <StyledLink to={`/doc/${sharedParent.documentId}`}>
                  {{ documentTitle }}
                </StyledLink>
                , is shared
              </Trans>
            ) : (
              <>
                {t("Allow anyone with the link to access")}
                {share?.published && !share.includeChildDocuments
                  ? `. ${t(
                      "Child documents are not shared, toggling sharing to enable"
                    )}.`
                  : ""}
              </>
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
              disabled={!canPublish}
              width={26}
              height={14}
            />
          )
        }
      />

      <ResizingHeightContainer>
        {sharedParent?.published ? (
          <ShareLinkInput type="text" disabled defaultValue={shareUrl}>
            {copyButton}
          </ShareLinkInput>
        ) : share?.published ? (
          <ShareLinkInput
            type="text"
            ref={inputRef}
            placeholder={share?.id}
            onChange={handleUrlSlugChange}
            error={slugValidationError}
            defaultValue={urlSlug}
            prefix={
              <DomainPrefix
                readOnly
                onClick={() => inputRef.current?.focus()}
                value={env.URL.replace(/https?:\/\//, "") + "/s/"}
              />
            }
          >
            {copyButton}
          </ShareLinkInput>
        ) : null}
      </ResizingHeightContainer>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  margin-bottom: 8px;
`;

const DomainPrefix = styled(NativeInput)`
  flex: 0 1 auto;
  padding-right: 0 !important;
  margin-right: -10px;
  cursor: text;
  color: ${s("placeholder")};
  user-select: none;
`;

const ShareLinkInput = styled(Input)`
  margin-top: 12px;
  min-width: 100px;
  flex: 1;

  ${NativeInput} {
    padding: 4px 8px;
  }
`;

const StyledLink = styled(Link)`
  color: ${s("textSecondary")};
  text-decoration: underline;
`;

export default observer(PublicAccess);
