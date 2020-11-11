// @flow
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import { withTranslation } from "react-i18next";
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
import {
  DropdownMenu,
  DropdownMenuItem,
  Header,
} from "components/DropdownMenu";
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

@withTranslation()
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
    const { t } = this.props;
    this.props.ui.showToast(t("Document duplicated"));
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
    const { t } = this.props;
    this.props.ui.showToast(t("Document archived"));
  };

  handleRestore = async (
    ev: SyntheticEvent<>,
    options?: { collectionId: string }
  ) => {
    await this.props.document.restore(options);
    const { t } = this.props;
    this.props.ui.showToast(t("Document restored"));
  };

  handleUnpublish = async (ev: SyntheticEvent<>) => {
    await this.props.document.unpublish();
    const { t } = this.props;
    this.props.ui.showToast(t("Document unpublished"));
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
      t,
    } = this.props;

    const can = policies.abilities(document.id);
    const canShareDocuments = can.share && auth.team && auth.team.sharing;
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
          {can.unarchive && (
            <DropdownMenuItem onClick={this.handleRestore}>
              {t("Restore")}
            </DropdownMenuItem>
          )}
          {can.restore &&
            (collection ? (
              <DropdownMenuItem onClick={this.handleRestore}>
                {t("Restore")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenu
                label={<DropdownMenuItem>{t("Restore…")}</DropdownMenuItem>}
                style={{
                  left: -170,
                  position: "relative",
                  top: -40,
                }}
                hover
              >
                <Header>{t("Choose a collection")}</Header>
                {collections.orderedData.map((collection) => {
                  const can = policies.abilities(collection.id);

                  return (
                    <DropdownMenuItem
                      key={collection.id}
                      onClick={(ev) =>
                        this.handleRestore(ev, { collectionId: collection.id })
                      }
                      disabled={!can.update}
                    >
                      <CollectionIcon collection={collection} />
                      &nbsp;{collection.name}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenu>
            ))}
          {showPin &&
            (document.pinned
              ? can.unpin && (
                  <DropdownMenuItem onClick={this.handleUnpin}>
                    {t("Unpin")}
                  </DropdownMenuItem>
                )
              : can.pin && (
                  <DropdownMenuItem onClick={this.handlePin}>
                    {t("Pin to collection")}
                  </DropdownMenuItem>
                ))}
          {document.isStarred
            ? can.unstar && (
                <DropdownMenuItem onClick={this.handleUnstar}>
                  {t("Unstar")}
                </DropdownMenuItem>
              )
            : can.star && (
                <DropdownMenuItem onClick={this.handleStar}>
                  {t("Star")}
                </DropdownMenuItem>
              )}
          {canShareDocuments && (
            <DropdownMenuItem
              onClick={this.handleShareLink}
              title={t("Create a public share link")}
            >
              {t("Share link…")}
            </DropdownMenuItem>
          )}
          {showToggleEmbeds && (
            <>
              {document.embedsDisabled ? (
                <DropdownMenuItem onClick={document.enableEmbeds}>
                  {t("Enable embeds")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={document.disableEmbeds}>
                  {t("Disable embeds")}
                </DropdownMenuItem>
              )}
            </>
          )}
          {!can.restore && <hr />}

          {can.createChildDocument && (
            <DropdownMenuItem
              onClick={this.handleNewChild}
              title={t("Create a nested document inside the current document")}
            >
              {t("New nested document")}
            </DropdownMenuItem>
          )}
          {can.update && !document.isTemplate && (
            <DropdownMenuItem onClick={this.handleOpenTemplateModal}>
              {t("Create template…")}
            </DropdownMenuItem>
          )}
          {can.unpublish && (
            <DropdownMenuItem onClick={this.handleUnpublish}>
              {t("Unpublish")}
            </DropdownMenuItem>
          )}
          {can.update && (
            <DropdownMenuItem onClick={this.handleEdit}>
              {t("Edit")}
            </DropdownMenuItem>
          )}
          {can.update && (
            <DropdownMenuItem onClick={this.handleDuplicate}>
              {t("Duplicate")}
            </DropdownMenuItem>
          )}
          {can.archive && (
            <DropdownMenuItem onClick={this.handleArchive}>
              {t("Archive")}
            </DropdownMenuItem>
          )}
          {can.delete && (
            <DropdownMenuItem onClick={this.handleDelete}>
              {t("Delete…")}
            </DropdownMenuItem>
          )}
          {can.move && (
            <DropdownMenuItem onClick={this.handleMove}>
              {t("Move…")}
            </DropdownMenuItem>
          )}
          <hr />
          {canViewHistory && (
            <>
              <DropdownMenuItem onClick={this.handleDocumentHistory}>
                {t("History")}
              </DropdownMenuItem>
            </>
          )}
          {can.download && (
            <DropdownMenuItem onClick={this.handleExport}>
              {t("Download")}
            </DropdownMenuItem>
          )}
          {showPrint && (
            <DropdownMenuItem onClick={window.print}>
              {t("Print")}
            </DropdownMenuItem>
          )}
        </DropdownMenu>
        <Modal
          title={t("Delete {{ documentName }}", {
            documentName: this.props.document.noun,
          })}
          onRequestClose={this.handleCloseDeleteModal}
          isOpen={this.showDeleteModal}
        >
          <DocumentDelete
            document={this.props.document}
            onSubmit={this.handleCloseDeleteModal}
          />
        </Modal>
        <Modal
          title={t("Create template")}
          onRequestClose={this.handleCloseTemplateModal}
          isOpen={this.showTemplateModal}
        >
          <DocumentTemplatize
            document={this.props.document}
            onSubmit={this.handleCloseTemplateModal}
          />
        </Modal>
        <Modal
          title={t("Share document")}
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
