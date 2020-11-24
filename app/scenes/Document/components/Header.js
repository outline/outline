// @flow
import { throttle } from "lodash";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import {
  TableOfContentsIcon,
  EditIcon,
  GlobeIcon,
  PlusIcon,
  MoreIcon,
} from "outline-icons";
import { transparentize, darken } from "polished";
import * as React from "react";
import { Redirect } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import AuthStore from "stores/AuthStore";
import PoliciesStore from "stores/PoliciesStore";
import SharesStore from "stores/SharesStore";
import UiStore from "stores/UiStore";
import Document from "models/Document";

import DocumentShare from "scenes/DocumentShare";
import { Action, Separator } from "components/Actions";
import Badge from "components/Badge";
import Breadcrumb, { Slash } from "components/Breadcrumb";
import Button from "components/Button";
import Collaborators from "components/Collaborators";
import Fade from "components/Fade";
import Flex from "components/Flex";
import Modal from "components/Modal";
import Tooltip from "components/Tooltip";
import DocumentMenu from "menus/DocumentMenu";
import NewChildDocumentMenu from "menus/NewChildDocumentMenu";
import TemplatesMenu from "menus/TemplatesMenu";
import { meta } from "utils/keyboard";
import { newDocumentUrl, editDocumentUrl } from "utils/routeHelpers";

type Props = {
  auth: AuthStore,
  ui: UiStore,
  shares: SharesStore,
  policies: PoliciesStore,
  document: Document,
  isDraft: boolean,
  isEditing: boolean,
  isRevision: boolean,
  isSaving: boolean,
  isPublishing: boolean,
  publishingIsDisabled: boolean,
  savingIsDisabled: boolean,
  onDiscard: () => void,
  onSave: ({
    done?: boolean,
    publish?: boolean,
    autosave?: boolean,
  }) => void,
};

@observer
class Header extends React.Component<Props> {
  @observable isScrolled = false;
  @observable showShareModal = false;
  @observable redirectTo: ?string;

  componentDidMount() {
    window.addEventListener("scroll", this.handleScroll);
  }

  componentWillUnmount() {
    window.removeEventListener("scroll", this.handleScroll);
  }

  updateIsScrolled = () => {
    this.isScrolled = window.scrollY > 75;
  };

  handleScroll = throttle(this.updateIsScrolled, 50);

  handleEdit = () => {
    this.redirectTo = editDocumentUrl(this.props.document);
  };

  handleNewFromTemplate = () => {
    const { document } = this.props;

    this.redirectTo = newDocumentUrl(document.collectionId, {
      templateId: document.id,
    });
  };

  handleSave = () => {
    this.props.onSave({ done: true });
  };

  handlePublish = () => {
    this.props.onSave({ done: true, publish: true });
  };

  handleShareLink = async (ev: SyntheticEvent<>) => {
    const { document } = this.props;
    await document.share();

    this.showShareModal = true;
  };

  handleCloseShareModal = () => {
    this.showShareModal = false;
  };

  handleClickTitle = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    const {
      shares,
      document,
      policies,
      isEditing,
      isDraft,
      isPublishing,
      isRevision,
      isSaving,
      savingIsDisabled,
      publishingIsDisabled,
      ui,
      auth,
    } = this.props;

    const share = shares.getByDocumentId(document.id);
    const isPubliclyShared = share && share.published;
    const isNew = document.isNew;
    const isTemplate = document.isTemplate;
    const can = policies.abilities(document.id);
    const canShareDocuments = auth.team && auth.team.sharing && can.share;
    const canToggleEmbeds = auth.team && auth.team.documentEmbeds;
    const canEdit = can.update && !isEditing;

    return (
      <Actions
        align="center"
        justify="space-between"
        readOnly={!isEditing}
        isCompact={this.isScrolled}
        shrink={false}
      >
        <Modal
          isOpen={this.showShareModal}
          onRequestClose={this.handleCloseShareModal}
          title="Share document"
        >
          <DocumentShare
            document={document}
            onSubmit={this.handleCloseShareModal}
          />
        </Modal>
        <BreadcrumbAndContents align="center" justify="flex-start">
          <Breadcrumb document={document} />
          {!isEditing && (
            <>
              <Slash />
              <Tooltip
                tooltip={ui.tocVisible ? "Hide contents" : "Show contents"}
                shortcut={`ctrl+${meta}+h`}
                delay={250}
                placement="bottom"
              >
                <Button
                  onClick={
                    ui.tocVisible
                      ? ui.hideTableOfContents
                      : ui.showTableOfContents
                  }
                  icon={<TableOfContentsIcon />}
                  iconColor="currentColor"
                  borderOnHover
                  neutral
                  small
                />
              </Tooltip>
            </>
          )}
        </BreadcrumbAndContents>
        {this.isScrolled && (
          <Title onClick={this.handleClickTitle}>
            <Fade>
              {document.title} {document.isArchived && <Badge>Archived</Badge>}
            </Fade>
          </Title>
        )}
        <Wrapper align="center" justify="flex-end">
          {isSaving && !isPublishing && (
            <Action>
              <Status>Saving…</Status>
            </Action>
          )}
          &nbsp;
          <Fade>
            <Collaborators
              document={document}
              currentUserId={auth.user ? auth.user.id : undefined}
            />
          </Fade>
          {isEditing && !isTemplate && isNew && (
            <Action>
              <TemplatesMenu document={document} />
            </Action>
          )}
          {!isEditing && canShareDocuments && (
            <Action>
              <Tooltip
                tooltip={
                  isPubliclyShared ? (
                    <>
                      Anyone with the link <br />
                      can view this document
                    </>
                  ) : (
                    ""
                  )
                }
                delay={500}
                placement="bottom"
              >
                <Button
                  icon={isPubliclyShared ? <GlobeIcon /> : undefined}
                  onClick={this.handleShareLink}
                  neutral
                  small
                >
                  Share
                </Button>
              </Tooltip>
            </Action>
          )}
          {isEditing && (
            <>
              <Action>
                <Tooltip
                  tooltip="Save"
                  shortcut={`${meta}+enter`}
                  delay={500}
                  placement="bottom"
                >
                  <Button
                    onClick={this.handleSave}
                    disabled={savingIsDisabled}
                    isSaving={isSaving}
                    neutral={isDraft}
                    small
                  >
                    {isDraft ? "Save Draft" : "Done Editing"}
                  </Button>
                </Tooltip>
              </Action>
            </>
          )}
          {canEdit && (
            <Action>
              <Tooltip
                tooltip={`Edit ${document.noun}`}
                shortcut="e"
                delay={500}
                placement="bottom"
              >
                <Button
                  icon={<EditIcon />}
                  onClick={this.handleEdit}
                  neutral
                  small
                >
                  Edit
                </Button>
              </Tooltip>
            </Action>
          )}
          {canEdit && can.createChildDocument && (
            <Action>
              <NewChildDocumentMenu
                document={document}
                label={
                  <Tooltip
                    tooltip="New document"
                    shortcut="n"
                    delay={500}
                    placement="bottom"
                  >
                    <Button icon={<PlusIcon />} neutral>
                      New doc
                    </Button>
                  </Tooltip>
                }
              />
            </Action>
          )}
          {canEdit && isTemplate && !isDraft && !isRevision && (
            <Action>
              <Button
                icon={<PlusIcon />}
                onClick={this.handleNewFromTemplate}
                primary
                small
              >
                New from template
              </Button>
            </Action>
          )}
          {can.update && isDraft && !isRevision && (
            <Action>
              <Tooltip
                tooltip="Publish"
                shortcut={`${meta}+shift+p`}
                delay={500}
                placement="bottom"
              >
                <Button
                  onClick={this.handlePublish}
                  title="Publish document"
                  disabled={publishingIsDisabled}
                  small
                >
                  {isPublishing ? "Publishing…" : "Publish"}
                </Button>
              </Tooltip>
            </Action>
          )}
          {!isEditing && (
            <>
              <Separator />
              <Action>
                <DocumentMenu
                  document={document}
                  isRevision={isRevision}
                  label={
                    <Button
                      icon={<MoreIcon />}
                      iconColor="currentColor"
                      borderOnHover
                      neutral
                      small
                    />
                  }
                  showToggleEmbeds={canToggleEmbeds}
                  showPrint
                />
              </Action>
            </>
          )}
        </Wrapper>
      </Actions>
    );
  }
}

const Status = styled.div`
  color: ${(props) => props.theme.slate};
`;

const BreadcrumbAndContents = styled(Flex)`
  display: none;

  ${breakpoint("tablet")`	
    display: flex;
    width: 33.3%;
  `};
`;

const Wrapper = styled(Flex)`
  width: 100%;
  align-self: flex-end;
  height: 32px;

  ${breakpoint("tablet")`	
    width: 33.3%;
  `};
`;

const Actions = styled(Flex)`
  position: sticky;
  top: 0;
  right: 0;
  left: 0;
  z-index: 2;
  background: ${(props) => transparentize(0.2, props.theme.background)};
  box-shadow: 0 1px 0
    ${(props) =>
      props.isCompact
        ? darken(0.05, props.theme.sidebarBackground)
        : "transparent"};
  padding: 12px;
  transition: all 100ms ease-out;
  transform: translate3d(0, 0, 0);
  backdrop-filter: blur(20px);

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    padding: ${(props) => (props.isCompact ? "12px" : `24px 24px 0`)};
  `};
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  align-items: center;
  justify-content: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  display: none;
  width: 0;

  ${breakpoint("tablet")`	
    display: flex;
    flex-grow: 1;
  `};
`;

export default inject("auth", "ui", "policies", "shares")(Header);
