import invariant from "invariant";
import debounce from "lodash/debounce";
import isEmpty from "lodash/isEmpty";
import { observer } from "mobx-react";
import { QuestionMarkIcon, TeamIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import { CollectionPermission } from "@shared/types";
import { dateLocale, dateToRelative } from "@shared/utils/date";
import { SHARE_URL_SLUG_REGEX } from "@shared/utils/urlHelpers";
import Document from "~/models/Document";
import Share from "~/models/Share";
import Button from "~/components/Button";
import CopyToClipboard from "~/components/CopyToClipboard";
import Flex from "~/components/Flex";
import Input, { NativeInput } from "~/components/Input";
import Notice from "~/components/Notice";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useKeyDown from "~/hooks/useKeyDown";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useUserLocale from "~/hooks/useUserLocale";
import CollectionIcon from "../Icons/CollectionIcon";
import { Label } from "../Labeled";
import Item from "../List/Item";
import Tooltip from "../Tooltip";
import DocumentMembersList from "./DocumentMemberList";

type Props = {
  /** The document to share. */
  document: Document;
  /** The existing share model, if any. */
  share: Share | null | undefined;
  /** The existing share parent model, if any. */
  sharedParent: Share | null | undefined;
  /** Whether to hide the title. */
  hideTitle?: boolean;
  /** Callback fired when the popover requests to be closed. */
  onRequestClose: () => void;
  /** Whether the popover is visible. */
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
  const [expandedOptions, setExpandedOptions] = React.useState(false);
  const [slugValidationError, setSlugValidationError] = React.useState("");
  const [urlSlug, setUrlSlug] = React.useState("");
  const timeout = React.useRef<ReturnType<typeof setTimeout>>();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const can = usePolicy(share);
  const documentAbilities = usePolicy(document);
  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const canPublish =
    can.update &&
    team.sharing &&
    (!document.collectionId || collection?.sharing) &&
    documentAbilities.share;

  React.useEffect(() => {
    if (!visible && expandedOptions) {
      setExpandedOptions(false);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps
  useKeyDown("Escape", onRequestClose);

  React.useEffect(() => {
    if (visible) {
      void document.share();
      buttonRef.current?.focus();
    }

    return () => (timeout.current ? clearTimeout(timeout.current) : undefined);
  }, [document, visible]);

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
        toast.error(err.message);
      }
    },
    [document.id, shares]
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
        toast.error(err.message);
      }
    },
    [document.id, shares]
  );

  const handleCopied = React.useCallback(() => {
    timeout.current = setTimeout(() => {
      onRequestClose();
      toast.message(t("Share link copied"));
    }, 250);
  }, [t, onRequestClose]);

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

  const PublishToInternet = () => (
    <Switch
      id="published"
      label={t("Publish to internet")}
      note={
        <>
          {t("Allow anyone with the link to view this document")}
          {share?.lastAccessedAt && (
            <>
              .{" "}
              {t("The shared link was last accessed {{ timeAgo }}.", {
                timeAgo: dateToRelative(Date.parse(share?.lastAccessedAt), {
                  addSuffix: true,
                  locale,
                }),
              })}
            </>
          )}
        </>
      }
      onChange={handlePublishedChange}
      checked={share ? share.published : false}
      disabled={!share}
    />
  );

  const userLocale = useUserLocale();
  const locale = userLocale ? dateLocale(userLocale) : undefined;
  const shareUrl = sharedParent?.url
    ? `${sharedParent.url}${document.url}`
    : share?.url ?? "";
  const documentTitle = sharedParent?.documentTitle;

  return (
    <>
      <Heading>{t("People with access")}</Heading>
      <DocumentMembersList document={document}>
        {collection?.permission ? (
          <Item
            image={<TeamIcon />}
            title="All workspace members"
            actions={
              <CollectionAccess>
                {collection?.permission === CollectionPermission.ReadWrite
                  ? t("Can edit")
                  : t("Can view")}
              </CollectionAccess>
            }
            border={false}
            small
          />
        ) : collection ? (
          <Item
            image={<CollectionIcon collection={collection} />}
            title="Collection members"
            actions={<CollectionAccess>{t("Can view")}</CollectionAccess>}
            border={false}
            small
          />
        ) : null}
      </DocumentMembersList>

      <Separator />
      <Heading>{t("Public access")}</Heading>

      <>
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

        {!sharedParent?.published && <PublishToInternet />}

        {share?.published && (
          <>
            {!sharedParent?.published && (
              <>
                {canPublish && !document.isDraft && (
                  <Switch
                    id="includeChildDocuments"
                    note={t(
                      "Documents nested under this document will be shared"
                    )}
                    label={t("Share child documents")}
                    onChange={handleChildDocumentsChange}
                    checked={share ? share.includeChildDocuments : false}
                    disabled={!share}
                  />
                )}

                <Flex align="center" justify="space-between" gap={8}>
                  <Flex column>
                    <StyledLabel>{t("Custom link")}</StyledLabel>
                    <Text type="secondary" size="small">
                      {env.URL.replace(/https?:\/\//, "")}/s/
                    </Text>
                  </Flex>
                  <CustomSlugInput
                    type="text"
                    placeholder="a-unique-link"
                    onChange={handleUrlSlugChange}
                    error={slugValidationError}
                    defaultValue={urlSlug}
                  />
                </Flex>
              </>
            )}

            <Flex justify="flex-end" style={{ marginBottom: 8 }}>
              <CopyToClipboard text={shareUrl} onCopy={handleCopied}>
                <Button
                  type="submit"
                  disabled={!share || slugValidationError}
                  ref={buttonRef}
                >
                  {t("Copy link")}
                </Button>
              </CopyToClipboard>
            </Flex>
          </>
        )}
      </>
    </>
  );
}

const CollectionAccess = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();

  return (
    <Tooltip tooltip={t("Access inherited from collection")}>
      <span>
        <Text type="secondary" size="small" as={Flex} align="center" gap={2}>
          {children} <QuestionMarkIcon size={18} />
        </Text>
      </span>
    </Tooltip>
  );
};

const CustomSlugInput = styled(Input)`
  ${NativeInput} {
    padding: 4px 8px;
  }
`;

const StyledLabel = styled(Label)`
  padding-bottom: 0;
`;

const StyledLink = styled(Link)`
  color: ${s("textSecondary")};
  text-decoration: underline;
`;

const Heading = styled(Text).attrs({ size: "large", weight: "bold" })`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
`;

const NoticeWrapper = styled.div`
  margin: 20px 0;
`;

const Separator = styled.div`
  height: 1px;
  margin: 16px 0;
  width: 100%;
  background-color: ${s("divider")};
`;

export default observer(SharePopover);
