// @flow
import * as React from 'react';
import { throttle } from 'lodash';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import { NewDocumentIcon } from 'outline-icons';
import Document from 'models/Document';
import { documentEditUrl } from 'utils/routeHelpers';

import Flex from 'shared/components/Flex';
import Breadcrumb from './Breadcrumb';
import DocumentMenu from 'menus/DocumentMenu';
import NewChildDocumentMenu from 'menus/NewChildDocumentMenu';
import DocumentShare from 'scenes/DocumentShare';
import Modal from 'components/Modal';
import Collaborators from 'components/Collaborators';
import { Action, Separator } from 'components/Actions';

type Props = {
  document: Document,
  isDirty: boolean,
  isDraft: boolean,
  isEditing: boolean,
  isSaving: boolean,
  isPublishing: boolean,
  savingIsDisabled: boolean,
  onDiscard: () => *,
  onSave: ({
    done?: boolean,
    publish?: boolean,
    autosave?: boolean,
  }) => *,
  history: Object,
};

@observer
class Header extends React.Component<Props> {
  @observable isScrolled = false;
  @observable showShareModal = false;

  componentDidMount() {
    window.addEventListener('scroll', this.handleScroll);
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
  }

  updateIsScrolled = () => {
    this.isScrolled = window.scrollY > 75;
  };

  handleScroll = throttle(this.updateIsScrolled, 50);

  handleEdit = () => {
    this.props.history.push(documentEditUrl(this.props.document));
  };

  handleSave = () => {
    this.props.onSave({ done: true });
  };

  handlePublish = () => {
    this.props.onSave({ done: true, publish: true });
  };

  handleShareLink = async (ev: SyntheticEvent<*>) => {
    const { document } = this.props;
    if (!document.shareUrl) await document.share();
    this.showShareModal = true;
  };

  handleCloseShareModal = () => {
    this.showShareModal = false;
  };

  handleClickTitle = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  render() {
    const {
      document,
      isEditing,
      isDraft,
      isDirty,
      isPublishing,
      isSaving,
      savingIsDisabled,
    } = this.props;

    return (
      <Actions
        align="center"
        justify="space-between"
        readOnly={!isEditing}
        isCompact={this.isScrolled}
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
        <Breadcrumb document={document} />
        <Title isHidden={!this.isScrolled} onClick={this.handleClickTitle}>
          {document.title}
        </Title>
        <Wrapper align="center" justify="flex-end">
          {!isDraft && !isEditing && <Collaborators document={document} />}
          {isSaving &&
            !isPublishing && (
              <Action>
                <Status>Saving…</Status>
              </Action>
            )}
          {isDraft && (
            <Action>
              <Link
                onClick={this.handlePublish}
                title="Publish document (Cmd+Enter)"
                disabled={savingIsDisabled}
                highlight
              >
                {isPublishing ? 'Publishing…' : 'Publish'}
              </Link>
            </Action>
          )}
          {!isDraft &&
            !isEditing && (
              <Action>
                <Link onClick={this.handleShareLink} title="Share document">
                  Share
                </Link>
              </Action>
            )}
          {isEditing && (
            <React.Fragment>
              <Action>
                <Link
                  onClick={this.handleSave}
                  title="Save changes (Cmd+Enter)"
                  disabled={savingIsDisabled}
                  isSaving={isSaving}
                  highlight={!isDraft}
                >
                  {isDraft ? 'Save Draft' : 'Done'}
                </Link>
              </Action>
            </React.Fragment>
          )}
          {!isEditing && (
            <Action>
              <Link onClick={this.handleEdit}>Edit</Link>
            </Action>
          )}
          {!isEditing && (
            <Action>
              <DocumentMenu document={document} showPrint />
            </Action>
          )}
          {!isEditing &&
            !isDraft && (
              <React.Fragment>
                <Separator />
                <Action>
                  <NewChildDocumentMenu
                    document={document}
                    label={<NewDocumentIcon />}
                  />
                </Action>
              </React.Fragment>
            )}
        </Wrapper>
      </Actions>
    );
  }
}

const Status = styled.div`
  color: ${props => props.theme.slate};
`;

const Wrapper = styled(Flex)`
  width: 100%;
  align-self: flex-end;

  ${breakpoint('tablet')`	
    width: 33.3%;
  `};
`;

const Actions = styled(Flex)`
  position: sticky;
  top: 0;
  right: 0;
  left: 0;
  z-index: 1;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid
    ${props => (props.isCompact ? props.theme.smoke : 'transparent')};
  padding: 12px;
  transition: all 100ms ease-out;
  transform: translate3d(0, 0, 0);
  -webkit-backdrop-filter: blur(20px);

  @media print {
    display: none;
  }

  ${breakpoint('tablet')`
    padding: ${props => (props.isCompact ? '12px' : `24px 24px 0`)};
  `};
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  justify-content: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 100ms ease-in-out;
  opacity: ${props => (props.isHidden ? '0' : '1')};
  cursor: ${props => (props.isHidden ? 'default' : 'pointer')};
  display: none;
  width: 0;

  ${breakpoint('tablet')`	
    display: block;
    flex-grow: 1;
  `};
`;

const Link = styled.a`
  display: flex;
  align-items: center;
  font-weight: ${props => (props.highlight ? 500 : 'inherit')};
  color: ${props =>
    props.highlight ? `${props.theme.primary} !important` : 'inherit'};
  opacity: ${props => (props.disabled ? 0.5 : 1)};
  pointer-events: ${props => (props.disabled ? 'none' : 'auto')};
  cursor: ${props => (props.disabled ? 'default' : 'pointer')};
`;

export default Header;
