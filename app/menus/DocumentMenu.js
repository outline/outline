// @flow
import * as React from 'react';
import { Redirect } from 'react-router-dom';
import { observable } from 'mobx';
import { inject, observer } from 'mobx-react';

import Document from 'models/Document';
import UiStore from 'stores/UiStore';
import AuthStore from 'stores/AuthStore';
import CollectionStore from 'stores/CollectionsStore';
import PoliciesStore from 'stores/PoliciesStore';
import {
  documentMoveUrl,
  documentEditUrl,
  documentHistoryUrl,
  newDocumentUrl,
} from 'utils/routeHelpers';
import { DropdownMenu, DropdownMenuItem } from 'components/DropdownMenu';

type Props = {
  ui: UiStore,
  auth: AuthStore,
  position?: 'left' | 'right' | 'center',
  document: Document,
  collections: CollectionStore,
  policies: PoliciesStore,
  className: string,
  showPrint?: boolean,
  showToggleEmbeds?: boolean,
  showPin?: boolean,
  onOpen?: () => void,
  onClose?: () => void,
};

@observer
class DocumentMenu extends React.Component<Props> {
  @observable redirectTo: ?string;

  componentDidUpdate() {
    this.redirectTo = undefined;
  }

  handleNewChild = (ev: SyntheticEvent<>) => {
    const { document } = this.props;
    this.redirectTo = newDocumentUrl(document.collectionId, document.id);
  };

  handleDelete = (ev: SyntheticEvent<>) => {
    const { document } = this.props;
    this.props.ui.setActiveModal('document-delete', { document });
  };

  handleDocumentHistory = () => {
    this.redirectTo = documentHistoryUrl(this.props.document);
  };

  handleMove = (ev: SyntheticEvent<>) => {
    this.redirectTo = documentMoveUrl(this.props.document);
  };

  handleEdit = (ev: SyntheticEvent<>) => {
    this.redirectTo = documentEditUrl(this.props.document);
  };

  handleDuplicate = async (ev: SyntheticEvent<>) => {
    const duped = await this.props.document.duplicate();

    // when duplicating, go straight to the duplicated document content
    this.redirectTo = duped.url;
    this.props.ui.showToast('Document duplicated');
  };

  handleArchive = async (ev: SyntheticEvent<>) => {
    await this.props.document.archive();
    this.props.ui.showToast('Document archived');
  };

  handleRestore = async (ev: SyntheticEvent<>) => {
    await this.props.document.restore();
    this.props.ui.showToast('Document restored');
  };

  handlePin = (ev: SyntheticEvent<>) => {
    this.props.document.pin();
  };

  handleUnpin = (ev: SyntheticEvent<>) => {
    this.props.document.unpin();
  };

  handleStar = (ev: SyntheticEvent<>) => {
    this.props.document.star();
  };

  handleUnstar = (ev: SyntheticEvent<>) => {
    this.props.document.unstar();
  };

  handleExport = (ev: SyntheticEvent<>) => {
    this.props.document.download();
  };

  handleShareLink = async (ev: SyntheticEvent<>) => {
    const { document } = this.props;
    if (!document.shareUrl) await document.share();

    this.props.ui.setActiveModal('document-share', { document });
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    const {
      policies,
      document,
      position,
      className,
      showPrint,
      showPin,
      auth,
      onOpen,
      onClose,
    } = this.props;

    const can = policies.abilties(document.id);
    const canShareDocuments = can.share && auth.team && auth.team.sharing;

    return (
      <DropdownMenu
        className={className}
        position={position}
        onOpen={onOpen}
        onClose={onClose}
      >
        {can.unarchive && (
          <DropdownMenuItem onClick={this.handleRestore}>
            Restore
          </DropdownMenuItem>
        )}
        {showPin &&
          (document.pinned
            ? can.unpin && (
                <DropdownMenuItem onClick={this.handleUnpin}>
                  Unpin
                </DropdownMenuItem>
              )
            : can.pin && (
                <DropdownMenuItem onClick={this.handlePin}>
                  Pin to collection
                </DropdownMenuItem>
              ))}
        {document.isStarred
          ? can.unstar && (
              <DropdownMenuItem onClick={this.handleUnstar}>
                Unstar
              </DropdownMenuItem>
            )
          : can.star && (
              <DropdownMenuItem onClick={this.handleStar}>
                Star
              </DropdownMenuItem>
            )}
        {canShareDocuments && (
          <DropdownMenuItem
            onClick={this.handleShareLink}
            title="Create a public share link"
          >
            Share link…
          </DropdownMenuItem>
        )}
        <hr />
        {can.read && (
          <DropdownMenuItem onClick={this.handleDocumentHistory}>
            Document history
          </DropdownMenuItem>
        )}
        {can.update && (
          <DropdownMenuItem
            onClick={this.handleNewChild}
            title="Create a new child document for the current document"
          >
            New child document
          </DropdownMenuItem>
        )}
        {can.update && (
          <DropdownMenuItem onClick={this.handleEdit}>Edit</DropdownMenuItem>
        )}
        {can.update && (
          <DropdownMenuItem onClick={this.handleDuplicate}>
            Duplicate
          </DropdownMenuItem>
        )}
        {can.archive && (
          <DropdownMenuItem onClick={this.handleArchive}>
            Archive
          </DropdownMenuItem>
        )}
        {can.delete && (
          <DropdownMenuItem onClick={this.handleDelete}>
            Delete…
          </DropdownMenuItem>
        )}
        {can.move && (
          <DropdownMenuItem onClick={this.handleMove}>Move…</DropdownMenuItem>
        )}
        <hr />
        {can.download && (
          <DropdownMenuItem onClick={this.handleExport}>
            Download
          </DropdownMenuItem>
        )}
        {showPrint && (
          <DropdownMenuItem onClick={window.print}>Print</DropdownMenuItem>
        )}
      </DropdownMenu>
    );
  }
}

export default inject('ui', 'auth', 'collections', 'policies')(DocumentMenu);
