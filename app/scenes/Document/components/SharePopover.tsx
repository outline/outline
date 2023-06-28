import { formatDistanceToNow } from "date-fns";
import invariant from "invariant";
import { debounce, isEmpty } from "lodash";
import { observer } from "mobx-react";
import { ExpandedIcon, GlobeIcon, PadlockIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { SHARE_URL_SLUG_REGEX } from "@shared/utils/urlHelpers";
import Document from "~/models/Document";
import Share from "~/models/Share";
import Button from "~/components/Button";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import Input, { StyledText } from "~/components/Input";
import Notice from "~/components/Notice";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useKeyDown from "~/hooks/useKeyDown";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import useUserLocale from "~/hooks/useUserLocale";
import { dateLocale } from "~/utils/i18n";

type Props = {
  document: Document;
  share: Share | null | undefined;
  sharedParent: Share | null | undefined;
  onRequestClose: () => void;
  visible: boolean;
};

function SharePopover({
  document,
  share,
  sharedParent,
  onRequestClose,
  visible,
}: Props) {
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { shares, collections } = useStores();
  const { showToast } = useToasts();
  const [expandedOptions, setExpandedOptions] = React.useState(false);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [slugValidationError, setSlugValidationError] = React.useState("");
  const [urlSlug, setUrlSlug] = React.useState("");
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const can = usePolicy(share ? share.id : "");
  const documentAbilities = usePolicy(document);
  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const canPublish =
    can.update &&
    !document.isTemplate &&
    team.sharing &&
    collection?.sharing &&
    documentAbilities.share;
  const isPubliclyShared =
    team.sharing &&
    ((share && share.published) ||
      (sharedParent && sharedParent.published && !document.isDraft));

  React.useEffect(() => {
    if (!visible && expandedOptions) {
      setExpandedOptions(false);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  useKeyDown("Escape", onRequestClose);

  React.useEffect(() => {
    if (visible && team.sharing) {
      void document.share();
      buttonRef.current?.focus();
    }

    return () => (timeout.current ? clearTimeout(timeout.current) : undefined);
  }, [document, visible, team.sharing]);

  React.useEffect(() => {
    if (!visible) {
      setUrlSlug(share?.urlId || "");
      setSlugValidationError("");
    }
  }, [share, visible]);

  const handlePublishedChange = React.useCallback(
    async (event) => {
      const share = shares.getByDocumentId(document.id);
      invariant(share, "Share must exist");

      try {
        await share.save({
          published: event.currentTarget.checked,
        });
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [document.id, shares, showToast]
  );

  const handleChildDocumentsChange = React.useCallback(
    async (event) => {
      const share = shares.getByDocumentId(document.id);
      invariant(share, "Share must exist");

      try {
        await share.save({
          includeChildDocuments: event.currentTarget.checked,
        });
      } catch (err) {
        showToast(err.message, {
          type: "error",
        });
      }
    },
    [document.id, shares, showToast]
  );

  const handleCopied = React.useCallback(() => {
    timeout.current = setTimeout(() => {
      onRequestClose();
      showToast(t("Share link copied"), {
        type: "info",
      });
    }, 250);
  }, [t, onRequestClose, showToast]);

  const handleUrlSlugChange = React.useMemo(
    () =>
      debounce(async (ev) => {
        const share = shares.getByDocumentId(document.id);
        invariant(share, "Share must exist");

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
    [t, document.id, shares]
  );

  const PublishToInternet = ({ canPublish }: { canPublish: boolean }) => {
    if (!canPublish) {
      return (
        <Text type="secondary">
          {t("Only members with permission can view")}
        </Text>
      );
    }
    return (
      <SwitchWrapper>
        <Switch
          id="published"
          label={t("Publish to internet")}
          onChange={handlePublishedChange}
          checked={share ? share.published : false}
          disabled={!share}
        />
        <SwitchLabel>
          <SwitchText>
            {share?.published
              ? t("Anyone with the link can view this document")
              : t("Only members with permission can view")}
            {share?.lastAccessedAt && (
              <>
                .{" "}
                {t("The shared link was last accessed {{ timeAgo }}.", {
                  timeAgo: formatDistanceToNow(
                    Date.parse(share?.lastAccessedAt),
                    {
                      addSuffix: true,
                      locale,
                    }
                  ),
                })}
              </>
            )}
          </SwitchText>
        </SwitchLabel>
      </SwitchWrapper>
    );
  };

  const userLocale = useUserLocale();
  const locale = userLocale ? dateLocale(userLocale) : undefined;
  let shareUrl = team.sharing
    ? sharedParent?.url
      ? `${sharedParent.url}${document.url}`
      : share?.url ?? ""
    : `${team.url}${document.url}`;
  if (isEditMode) {
    shareUrl += "?edit=true";
  }

  const url = shareUrl.replace(/https?:\/\//, "");
  const documentTitle = sharedParent?.documentTitle;

  return (
    <>
      <Heading>
        {isPubliclyShared ? <GlobeIcon size={28} /> : <PadlockIcon size={28} />}
        <span>{t("Share this document")}</span>
      </Heading>

      {sharedParent && !document.isDraft && (
        <NoticeWrapper>
          <Notice>
            <Trans>
              This document is shared because the parent{" "}
              <StyledLink to={`/doc/${sharedParent.documentId}`}>
                {documentTitle}
              </StyledLink>{" "}
              is publicly shared.
            </Trans>
          </Notice>
        </NoticeWrapper>
      )}

      {canPublish && !sharedParent?.published && (
        <PublishToInternet canPublish />
      )}

      {canPublish && share?.published && !document.isDraft && (
        <SwitchWrapper>
          <Switch
            id="includeChildDocuments"
            label={t("Share nested documents")}
            onChange={handleChildDocumentsChange}
            checked={share ? share.includeChildDocuments : false}
            disabled={!share}
          />
          <SwitchLabel>
            <SwitchText>
              {share.includeChildDocuments
                ? t("Nested documents are publicly available")
                : t("Nested documents are not shared")}
              .
            </SwitchText>
          </SwitchLabel>
        </SwitchWrapper>
      )}

      {expandedOptions && (
        <>
          {canPublish && sharedParent?.published && (
            <>
              <Separator />
              <PublishToInternet canPublish />
            </>
          )}
          <Separator />
          <SwitchWrapper>
            <Switch
              id="enableEditMode"
              label={t("Automatically redirect to the editor")}
              onChange={({ currentTarget: { checked } }) =>
                setIsEditMode(checked)
              }
              checked={isEditMode}
              disabled={!share}
            />
            <SwitchLabel>
              <SwitchText>
                {isEditMode
                  ? t(
                      "Users with edit permission will be redirected to the main app"
                    )
                  : t("All users see the same publicly shared view")}
                .
              </SwitchText>
            </SwitchLabel>
          </SwitchWrapper>
          <Separator />
          <SwitchWrapper>
            <Input
              type="text"
              label={t("Custom link")}
              placeholder="a-unique-link"
              onChange={handleUrlSlugChange}
              error={slugValidationError}
              defaultValue={urlSlug}
            />
            {!slugValidationError && urlSlug && (
              <DocumentLinkPreview type="secondary">
                <Trans>
                  The document will be accessible at{" "}
                  <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                    {{ url }}
                  </a>
                </Trans>
              </DocumentLinkPreview>
            )}
          </SwitchWrapper>
        </>
      )}

      <Flex justify="space-between" style={{ marginBottom: 8 }}>
        {expandedOptions || !canPublish ? (
          <span />
        ) : (
          <MoreOptionsButton
            icon={<ExpandedIcon />}
            onClick={() => setExpandedOptions(true)}
            neutral
            borderOnHover
          >
            {t("More options")}
          </MoreOptionsButton>
        )}
        <CopyToClipboard text={shareUrl} onCopy={handleCopied}>
          <Button
            type="submit"
            disabled={(!share && team.sharing) || slugValidationError}
            ref={buttonRef}
          >
            {t("Copy link")}
          </Button>
        </CopyToClipboard>
      </Flex>
    </>
  );
}

const StyledLink = styled(Link)`
  color: ${s("textSecondary")};
  text-decoration: underline;
`;

const Heading = styled.h2`
  display: flex;
  align-items: center;
  margin-top: 12px;
  gap: 8px;

  /* accounts for icon padding */
  margin-left: -4px;
`;

const SwitchWrapper = styled.div`
  margin: 20px 0;
`;

const NoticeWrapper = styled.div`
  margin: 20px 0;
`;

const MoreOptionsButton = styled(Button)`
  background: none;
  font-size: 14px;
  color: ${s("textTertiary")};
  margin-left: -8px;
`;

const Separator = styled.div`
  height: 1px;
  width: 100%;
  background-color: ${s("divider")};
`;

const SwitchLabel = styled(Flex)`
  svg {
    flex-shrink: 0;
  }
`;

const SwitchText = styled(Text)`
  margin: 0;
  font-size: 15px;
`;

const DocumentLinkPreview = styled(StyledText)`
  margin-top: -12px;
`;

export default observer(SharePopover);
