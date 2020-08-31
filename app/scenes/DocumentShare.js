// @flow
import invariant from "invariant";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import { GlobeIcon, PadlockIcon } from "outline-icons";
import * as React from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import PoliciesStore from "stores/PoliciesStore";
import SharesStore from "stores/SharesStore";
import UiStore from "stores/UiStore";
import Document from "models/Document";
import Button from "components/Button";
import CopyToClipboard from "components/CopyToClipboard";
import Flex from "components/Flex";
import HelpText from "components/HelpText";
import Input from "components/Input";
import Switch from "components/Switch";

type Props = {
  document: Document,
  shares: SharesStore,
  ui: UiStore,
  policies: PoliciesStore,
  onSubmit: () => void,
};

@observer
class DocumentShare extends React.Component<Props> {
  @observable isCopied: boolean;
  @observable isSaving: boolean = false;
  timeout: TimeoutID;

  componentWillUnmount() {
    clearTimeout(this.timeout);
  }

  handlePublishedChange = async (event) => {
    const { document, shares } = this.props;
    const share = shares.getByDocumentId(document.id);
    invariant(share, "Share must exist");

    this.isSaving = true;

    try {
      await share.save({ published: event.target.checked });
    } catch (err) {
      this.props.ui.showToast(err.message);
    } finally {
      this.isSaving = false;
    }
  };

  handleCopied = () => {
    this.isCopied = true;

    this.timeout = setTimeout(() => {
      this.isCopied = false;
      this.props.onSubmit();
    }, 1500);
  };

  render() {
    const { document, policies, shares, onSubmit } = this.props;
    const share = shares.getByDocumentId(document.id);
    const can = policies.abilities(share ? share.id : "");
    const canPublish = can.update && !document.isTemplate;

    return (
      <div>
        <HelpText>
          The link below provides a read-only version of the document{" "}
          <strong>{document.titleWithDefault}</strong>.{" "}
          {canPublish
            ? "You can optionally make it accessible to anyone with the link."
            : "It is only viewable by those that already have access to the collection."}{" "}
          <Link to="/settings/shares" onClick={onSubmit}>
            Manage all share links
          </Link>
          .
        </HelpText>
        {canPublish && (
          <>
            <Switch
              id="published"
              label="Publish to internet"
              onChange={this.handlePublishedChange}
              checked={share ? share.published : false}
              disabled={!share || this.isSaving}
            />
            <Privacy>
              {share.published ? <GlobeIcon /> : <PadlockIcon />}
              <PrivacyText>
                {share.published
                  ? "Anyone with the link can view this document"
                  : "Only team members with access can view this document"}
              </PrivacyText>
            </Privacy>
          </>
        )}
        <br />
        <Input
          type="text"
          label="Get link"
          value={share ? share.url : "Loading…"}
          labelHidden
          readOnly
        />
        <CopyToClipboard
          text={share ? share.url : ""}
          onCopy={this.handleCopied}
        >
          <Button type="submit" disabled={this.isCopied || !share} primary>
            {this.isCopied ? "Copied!" : "Copy Link"}
          </Button>
        </CopyToClipboard>
        &nbsp;&nbsp;&nbsp;
        <a href={share.url} target="_blank">
          Preview
        </a>
      </div>
    );
  }
}

const Privacy = styled(Flex)`
  flex-align: center;
  margin-left: -4px;
`;

const PrivacyText = styled(HelpText)`
  margin: 0;
  margin-left: 2px;
  font-size: 15px;
`;

export default inject("shares", "ui", "policies")(DocumentShare);
