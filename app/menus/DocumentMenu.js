// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { Redirect } from "react-router-dom";
import AuthStore from "stores/AuthStore";
import CollectionStore from "stores/CollectionsStore";
import PoliciesStore from "stores/PoliciesStore";
import UiStore from "stores/UiStore";
import Document from "models/Document";
import DocumentDelete from "scenes/DocumentDelete";
import DocumentShare from "scenes/DocumentShare";
import DocumentTemplatize from "scenes/DocumentTemplatize";
import CollectionIcon from "components/CollectionIcon";
import { DropdownMenu } from "components/DropdownMenu";
import DropdownMenuItems from "components/DropdownMenu/DropdownMenuItems";
import Modal from "components/Modal";
import {
  documentHistoryUrl,
  documentMoveUrl,
  documentUrl,
  editDocumentUrl,
  newDocumentUrl,
} from "utils/routeHelpers";

type Props = {
  ui: UiStore,
  auth: AuthStore,
  position?: "left" | "right" | "center",
  document: Document,
  collections: CollectionStore,
  policies: PoliciesStore,
  className: string,
  isRevision?: boolean,
  showPrint?: boolean,
  showToggleEmbeds?: boolean,
  showPin?: boolean,
  label?: React.Node,
  onOpen?: () => void,
  onClose?: () => void,
};

@observer
class DocumentMenu extends React.Component<Props> {
  @observable redirectTo: ?string;
  @observable showDeleteModal = false;
  @observable showTemplateModal = false;
  @observable showShareModal = false;

  componentDidUpdate() {
    this.redirectTo = undefined;
  }

  handleNewChild = (ev: SyntheticEvent<>) => {
    const { document } = this.props;
    this.redirectTo = newDocumentUrl(document.collectionId, {
      parentDocumentId: document.id,
    });
  };

  handleDelete = (ev: SyntheticEvent<>) => {
    this.showDeleteModal = true;
  };

  handleDocumentHistory = () => {
    if (this.props.isRevision) {
      this.redirectTo = documentUrl(this.props.document);
    } else {
      this.redirectTo = documentHistoryUrl(this.props.document);
    }
  };

  handleMove = (ev: SyntheticEvent<>) => {
    this.redirectTo = documentMoveUrl(this.props.document);
  };

  handleEdit = (ev: SyntheticEvent<>) => {
    this.redirectTo = editDocumentUrl(this.props.document);
  };

  handleDuplicate = async (ev: SyntheticEvent<>) => {
    const duped = await this.props.document.duplicate();

    // when duplicating, go straight to the duplicated document content
    this.redirectTo = duped.url;
    this.props.ui.showToast("Document duplicated");
  };

  handleOpenTemplateModal = () => {
    this.showTemplateModal = true;
  };

  handleCloseTemplateModal = () => {
    this.showTemplateModal = false;
  };

  handleCloseDeleteModal = () => {
    this.showDeleteModal = false;
  };

  handleArchive = async (ev: SyntheticEvent<>) => {
    await this.props.document.archive();
    this.props.ui.showToast("Document archived");
  };

  handleRestore = async (
    ev: SyntheticEvent<>,
    options?: { collectionId: string }
  ) => {
    await this.props.document.restore(options);
    this.props.ui.showToast("Document restored");
  };

  handleUnpublish = async (ev: SyntheticEvent<>) => {
    await this.props.document.unpublish();
    this.props.ui.showToast("Document unpublished");
  };

  handlePin = (ev: SyntheticEvent<>) => {
    this.props.document.pin();
  };

  handleUnpin = (ev: SyntheticEvent<>) => {
    this.props.document.unpin();
  };

  handleStar = (ev: SyntheticEvent<>) => {
    ev.stopPropagation();
    this.props.document.star();
  };

  handleUnstar = (ev: SyntheticEvent<>) => {
    ev.stopPropagation();
    this.props.document.unstar();
  };

  handleExport = (ev: SyntheticEvent<>) => {
    this.props.document.download();
  };

  handleShareLink = async (ev: SyntheticEvent<>) => {
    const { document } = this.props;
    await document.share();
    this.showShareModal = true;
  };

  handleCloseShareModal = () => {
    this.showShareModal = false;
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    const {
      policies,
      document,
      position,
      className,
      showToggleEmbeds,
      showPrint,
      showPin,
      auth,
      collections,
      label,
      onOpen,
      onClose,
    } = this.props;

    const can = policies.abilities(document.id);
    const canShareDocuments = !!(can.share && auth.team && auth.team.sharing);
    const canViewHistory = can.read && !can.restore;
    const collection = collections.get(document.collectionId);

    return (
      <>
        <DropdownMenu
          className={className}
          position={position}
          onOpen={onOpen}
          onClose={onClose}
          label={label}
        >
          <DropdownMenuItems
            items={[
              {
                title: "Restore",
                visible: !!can.unarchive,
                onClick: this.handleRestore,
              },
              {
                title: "Restore",
                visible: !!(collection && can.restore),
                onClick: this.handleRestore,
              },
              {
                title: "Restore…",
                visible: !collection && !!can.restore,
                style: {
                  left: -170,
                  position: "relative",
                  top: -40,
                },
                hover: true,
                items: [
                  {
                    type: "heading",
                    title: "Choose a collection",
                  },
                  ...collections.orderedData.map((collection) => {
                    const can = policies.abilities(collection.id);

                    return {
                      title: (
                        <>
                          <CollectionIcon collection={collection} />
                          &nbsp;{collection.name}
                        </>
                      ),
                      onClick: (ev) =>
                        this.handleRestore(ev, { collectionId: collection.id }),
                      disabled: !can.update,
                    };
                  }),
                ],
              },
              {
                title: "Unpin",
                onClick: this.handleUnpin,
                visible: !!(showPin && document.pinned && can.unpin),
              },
              {
                title: "Pin to collection",
                onClick: this.handlePin,
                visible: !!(showPin && !document.pinned && can.pin),
              },
              {
                title: "Unstar",
                onClick: this.handleUnstar,
                visible: document.isStarred && !!can.unstar,
              },
              {
                title: "Star",
                onClick: this.handleStar,
                visible: !document.isStarred && !!can.star,
              },
              {
                title: "Share link…",
                onClick: this.handleShareLink,
                visible: canShareDocuments,
              },
              {
                title: "Enable embeds",
                onClick: document.enableEmbeds,
                visible: !!showToggleEmbeds && document.embedsDisabled,
              },
              {
                title: "Disable embeds",
                onClick: document.disableEmbeds,
                visible: !!showToggleEmbeds && !document.embedsDisabled,
              },
              {
                type: "separator",
              },
              {
                title: "New nested document",
                onClick: this.handleNewChild,
                visible: !!can.createChildDocument,
              },
              {
                title: "Create template…",
                onClick: this.handleOpenTemplateModal,
                visible: !!can.update && !document.isTemplate,
              },
              {
                title: "Edit",
                onClick: this.handleEdit,
                visible: !!can.update,
              },
              {
                title: "Duplicate",
                onClick: this.handleDuplicate,
                visible: !!can.update,
              },
              {
                title: "Unpublish",
                onClick: this.handleUnpublish,
                visible: !!can.unpublish,
              },
              {
                title: "Archive",
                onClick: this.handleArchive,
                visible: !!can.archive,
              },
              {
                title: "Delete…",
                onClick: this.handleDelete,
                visible: !!can.delete,
              },
              {
                title: "Move…",
                onClick: this.handleMove,
                visible: !!can.move,
              },
              {
                type: "separator",
              },
              {
                title: "History",
                onClick: this.handleDocumentHistory,
                visible: canViewHistory,
              },
              {
                title: "Download",
                onClick: this.handleExport,
                visible: !!can.download,
              },
              {
                title: "Print",
                onClick: window.print,
                visible: !!showPrint,
              },
            ]}
          />
        </DropdownMenu>
        <Modal
          title={`Delete ${this.props.document.noun}`}
          onRequestClose={this.handleCloseDeleteModal}
          isOpen={this.showDeleteModal}
        >
          <DocumentDelete
            document={this.props.document}
            onSubmit={this.handleCloseDeleteModal}
          />
        </Modal>
        <Modal
          title="Create template"
          onRequestClose={this.handleCloseTemplateModal}
          isOpen={this.showTemplateModal}
        >
          <DocumentTemplatize
            document={this.props.document}
            onSubmit={this.handleCloseTemplateModal}
          />
        </Modal>
        <Modal
          title="Share document"
          onRequestClose={this.handleCloseShareModal}
          isOpen={this.showShareModal}
        >
          <DocumentShare
            document={this.props.document}
            onSubmit={this.handleCloseShareModal}
          />
        </Modal>
      </>
    );
  }
}

export default inject("ui", "auth", "collections", "policies")(DocumentMenu);
