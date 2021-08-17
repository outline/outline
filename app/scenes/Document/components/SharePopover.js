// @flow
import { formatDistanceToNow } from "date-fns";
import invariant from "invariant";
import { observer } from "mobx-react";
import { GlobeIcon, PadlockIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import styled from "styled-components";
import Document from "models/Document";
import Share from "models/Share";
import Button from "components/Button";
import CopyToClipboard from "components/CopyToClipboard";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Notice from "components/Notice";
import Switch from "components/Switch";
import useStores from "hooks/useStores";
import useToasts from "hooks/useToasts";

type Props = {|
  document: Document,
  share: Share,
  sharedParent: ?Share,
  onSubmit: () => void,
|};

function SharePopover({ document, share, sharedParent, onSubmit }: Props) {
  const { t } = useTranslation();
  const { policies, shares } = useStores();
  const { showToast } = useToasts();
  const [isCopied, setIsCopied] = React.useState(false);
  const timeout = React.useRef<?TimeoutID>();
  const can = policies.abilities(share ? share.id : "");
  const canPublish = can.update && !document.isTemplate;
  const isPubliclyShared = (share && share.published) || sharedParent;

  React.useEffect(() => {
    document.share();
    return () => clearTimeout(timeout.current);
  }, [document]);

  const handlePublishedChange = React.useCallback(
    async (event) => {
      const share = shares.getByDocumentId(document.id);
      invariant(share, "Share must exist");

      try {
        await share.save({ published: event.currentTarget.checked });
      } catch (err) {
        showToast(err.message, { type: "error" });
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
        showToast(err.message, { type: "error" });
      }
    },
    [document.id, shares, showToast]
  );

  const handleCopied = React.useCallback(() => {
    setIsCopied(true);

    timeout.current = setTimeout(() => {
      setIsCopied(false);
      onSubmit();

      showToast(t("Share link copied"), { type: "info" });
    }, 250);
  }, [t, onSubmit, showToast]);

  return (
    <>
      <Heading>
        {isPubliclyShared ? (
          <GlobeIcon size={28} color="currentColor" />
        ) : (
          <PadlockIcon size={28} color="currentColor" />
        )}{" "}
        {t("Share this document")}
      </Heading>

      {sharedParent && (
        <Notice>
          <Trans
            defaults="This document is shared because the parent <em>{{ documentTitle }}</em> is publicly shared"
            values={{ documentTitle: sharedParent.documentTitle }}
            components={{ em: <strong /> }}
          />
        </Notice>
      )}

      {canPublish && (
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
              {share.published
                ? t("Anyone with the link can view this document")
                : t("Only team members with permission can view")}
              {share.lastAccessedAt && (
                <>
                  .{" "}
                  {t("The shared link was last accessed {{ timeAgo }}.", {
                    timeAgo: formatDistanceToNow(
                      Date.parse(share.lastAccessedAt),
                      {
                        addSuffix: true,
                      }
                    ),
                  })}
                </>
              )}
            </SwitchText>
          </SwitchLabel>
        </SwitchWrapper>
      )}
      {share && share.published && (
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
            </SwitchText>
          </SwitchLabel>
        </SwitchWrapper>
      )}
      <Flex>
        <InputLink
          type="text"
          label={t("Link")}
          placeholder={`${t("Loading")}…`}
          value={share ? share.url : ""}
          labelHidden
          readOnly
        />
        <CopyToClipboard text={share ? share.url : ""} onCopy={handleCopied}>
          <Button type="submit" disabled={isCopied || !share} primary>
            {t("Copy link")}
          </Button>
        </CopyToClipboard>
      </Flex>
    </>
  );
}

const Heading = styled.h2`
  display: flex;
  align-items: center;
  margin-top: 12px;
  margin-left: -4px;
`;

const SwitchWrapper = styled.div`
  margin: 20px 0;
`;

const InputLink = styled(Input)`
  flex-grow: 1;
  margin-right: 8px;
`;

const SwitchLabel = styled(Flex)`
  flex-align: center;

  svg {
    flex-shrink: 0;
  }
`;

const SwitchText = styled(HelpText)`
  margin: 0;
  font-size: 15px;
`;

export default observer(SharePopover);
