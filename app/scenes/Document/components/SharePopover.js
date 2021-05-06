// @flow
import distanceInWordsToNow from "date-fns/distance_in_words_to_now";
import invariant from "invariant";
import { observer } from "mobx-react";
import { GlobeIcon, PadlockIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Document from "models/Document";
import Share from "models/Share";
import Button from "components/Button";
import CopyToClipboard from "components/CopyToClipboard";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Switch from "components/Switch";
import useStores from "hooks/useStores";

type Props = {|
  document: Document,
  share: Share,
  onSubmit: () => void,
|};

function DocumentShare({ document, share, onSubmit }: Props) {
  const { t } = useTranslation();
  const { policies, shares, ui } = useStores();
  const [isCopied, setIsCopied] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const timeout = React.useRef<?TimeoutID>();
  const can = policies.abilities(share ? share.id : "");
  const canPublish = can.update && !document.isTemplate;

  React.useEffect(() => {
    document.share();
    return () => clearTimeout(timeout.current);
  }, [document]);

  const handlePublishedChange = React.useCallback(
    async (event) => {
      const share = shares.getByDocumentId(document.id);
      invariant(share, "Share must exist");

      setIsSaving(true);

      try {
        await share.save({ published: event.currentTarget.checked });
      } catch (err) {
        ui.showToast(err.message, { type: "error" });
      } finally {
        setIsSaving(false);
      }
    },
    [document.id, shares, ui]
  );

  const handleCopied = React.useCallback(() => {
    setIsCopied(true);

    timeout.current = setTimeout(() => {
      setIsCopied(false);
      onSubmit();

      ui.showToast(t("Share link copied"), { type: "info" });
    }, 250);
  }, [t, onSubmit, ui]);

  return (
    <>
      <Heading>
        {share && share.published ? (
          <GlobeIcon size={28} color="currentColor" />
        ) : (
          <PadlockIcon size={28} color="currentColor" />
        )}{" "}
        {t("Share this document")}
      </Heading>

      {canPublish && (
        <PrivacySwitch>
          <Switch
            id="published"
            label={t("Publish to internet")}
            onChange={handlePublishedChange}
            checked={share ? share.published : false}
            disabled={!share || isSaving}
          />
          <Privacy>
            <PrivacyText>
              {share.published
                ? t("Anyone with the link can view this document")
                : t("Only team members with access can view")}
              {share.lastAccessedAt && (
                <>
                  .{" "}
                  {t("The shared link was last accessed {{ timeAgo }}.", {
                    timeAgo: distanceInWordsToNow(share.lastAccessedAt, {
                      addSuffix: true,
                    }),
                  })}
                </>
              )}
            </PrivacyText>
          </Privacy>
        </PrivacySwitch>
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

const PrivacySwitch = styled.div`
  margin: 20px 0;
`;

const InputLink = styled(Input)`
  flex-grow: 1;
  margin-right: 8px;
`;

const Privacy = styled(Flex)`
  flex-align: center;

  svg {
    flex-shrink: 0;
  }
`;

const PrivacyText = styled(HelpText)`
  margin: 0;
  font-size: 15px;
`;

export default observer(DocumentShare);
