import invariant from "invariant";
import debounce from "lodash/debounce";
import isEmpty from "lodash/isEmpty";
import { observer } from "mobx-react";
import { GlobeIcon } from "outline-icons";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import { dateLocale, dateToRelative } from "@shared/utils/date";
import { SHARE_URL_SLUG_REGEX } from "@shared/utils/urlHelpers";
import Document from "~/models/Document";
import Share from "~/models/Share";
import Flex from "~/components/Flex";
import Input, { NativeInput } from "~/components/Input";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import env from "~/env";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import useUserLocale from "~/hooks/useUserLocale";
import Button from "../Button";
import CopyToClipboard from "../CopyToClipboard";
import { Label } from "../Labeled";

type Props = {
  /** The document to share. */
  document: Document;
  /** The existing share model, if any. */
  share: Share | null | undefined;
  /** The existing share parent model, if any. */
  sharedParent: Share | null | undefined;
  /** Ref to the Copy Link button */
  copyButtonRef?: React.RefObject<HTMLButtonElement>;
  /** Callback fired when the popover requests to be closed. */
  onCopied?: () => void;
};

function PublicAccess({ document, share, sharedParent, onCopied }: Props) {
  const { shares } = useStores();
  const { t } = useTranslation();
  const [slugValidationError, setSlugValidationError] = React.useState("");
  const [urlSlug, setUrlSlug] = React.useState("");
  const can = usePolicy(share);
  const documentAbilities = usePolicy(document);
  const collectionSharingDisabled = document.collection?.sharing === false;
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

  const userLocale = useUserLocale();
  const locale = userLocale ? dateLocale(userLocale) : undefined;
  const documentTitle = sharedParent?.documentTitle;

  const shareUrl = sharedParent?.url
    ? `${sharedParent.url}${document.url}`
    : share?.url ?? "";

  return (
    <>
      {sharedParent && !document.isDraft && (
        <Notice>
          <Trans>
            This document is already shared because the parent document,{" "}
            <StyledLink to={`/doc/${sharedParent.documentId}`}>
              {documentTitle}
            </StyledLink>
            , is publicly shared.
          </Trans>
        </Notice>
      )}

      {collectionSharingDisabled ? (
        <Switch
          label={t("Publish to internet")}
          note={t("Public sharing is disabled in this collection")}
          checked={false}
          disabled
        />
      ) : (
        !sharedParent?.published && (
          <>
            <Switch
              id="published"
              label={t("Publish to internet")}
              note={
                <>
                  {t("Allow anyone with the link to view this document")}.
                  {share?.published && share?.lastAccessedAt && (
                    <>
                      {" "}
                      {t("The shared link was last accessed {{ timeAgo }}.", {
                        timeAgo: dateToRelative(
                          Date.parse(share?.lastAccessedAt),
                          {
                            addSuffix: true,
                            locale,
                          }
                        ),
                      })}
                    </>
                  )}
                </>
              }
              onChange={handlePublishedChange}
              checked={share?.published ?? false}
              disabled={!can.update}
            />
            {share?.published && canPublish && (
              <>
                {!document.isDraft && (
                  <Switch
                    id="includeChildDocuments"
                    note={
                      <>
                        {t(
                          "Documents nested under this document will be shared"
                        )}
                        .
                      </>
                    }
                    label={t("Share child documents")}
                    onChange={handleChildDocumentsChange}
                    checked={share ? share.includeChildDocuments : false}
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
                    placeholder="a-unique-path"
                    onChange={handleUrlSlugChange}
                    error={slugValidationError}
                    defaultValue={urlSlug}
                  />
                </Flex>
              </>
            )}
          </>
        )
      )}

      {!collectionSharingDisabled &&
        (sharedParent?.published || share?.published) && (
          <Flex justify="flex-end" style={{ marginBottom: 8 }}>
            <CopyToClipboard text={shareUrl} onCopy={onCopied}>
              <Button icon={<GlobeIcon />} type="submit" disabled={!share}>
                {t("Copy public link")}
              </Button>
            </CopyToClipboard>
          </Flex>
        )}
    </>
  );
}

const CustomSlugInput = styled(Input)`
  margin-top: 12px;
  min-width: 100px;
  flex: 1;

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

const Notice = styled.div`
  margin: 20px 0;
  background: ${s("sidebarBackground")};
  color: ${s("sidebarText")};
  font-weight: 500;
  padding: 10px 12px;
  border-radius: 4px;
  user-select: none;
`;

export default observer(PublicAccess);
