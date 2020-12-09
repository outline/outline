// @flow
import { inject } from "mobx-react";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import { withRouter, type RouterHistory } from "react-router-dom";

import UiStore from "stores/UiStore";
import Document from "models/Document";
import Revision from "models/Revision";
import CopyToClipboard from "components/CopyToClipboard";
import { DropdownMenu, DropdownMenuItem } from "components/DropdownMenu";
import { documentHistoryUrl } from "utils/routeHelpers";

type Props = {
  onOpen?: () => void,
  onClose: () => void,
  history: RouterHistory,
  document: Document,
  revision: Revision,
  className?: string,
  label: React.Node,
  ui: UiStore,
  t: TFunction,
};

class RevisionMenu extends React.Component<Props> {
  handleRestore = async (ev: SyntheticEvent<>) => {
    ev.preventDefault();
    await this.props.document.restore({ revisionId: this.props.revision.id });
    const { t } = this.props;
    this.props.ui.showToast(t("Document restored"));
    this.props.history.push(this.props.document.url);
  };

  handleCopy = () => {
    const { t } = this.props;
    this.props.ui.showToast(t("Link copied"));
  };

  render() {
    const { className, label, onOpen, onClose, t } = this.props;
    const url = `${window.location.origin}${documentHistoryUrl(
      this.props.document,
      this.props.revision.id
    )}`;

    return (
      <DropdownMenu
        onOpen={onOpen}
        onClose={onClose}
        className={className}
        label={label}
      >
        <DropdownMenuItem onClick={this.handleRestore}>
          {t("Restore version")}
        </DropdownMenuItem>
        <hr />
        <CopyToClipboard text={url} onCopy={this.handleCopy}>
          <DropdownMenuItem>{t("Copy link")}</DropdownMenuItem>
        </CopyToClipboard>
      </DropdownMenu>
    );
  }
}

export default withTranslation()<RevisionMenu>(
  withRouter(inject("ui")(RevisionMenu))
);
