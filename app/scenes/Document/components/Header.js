// @flow
import * as React from 'react';
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now';
import { observable } from 'mobx';
import { observer } from 'mobx-react';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import { NewDocumentIcon } from 'outline-icons';
import Document from 'models/Document';
import { documentEditUrl, documentNewUrl } from 'utils/routeHelpers';

import Flex from 'shared/components/Flex';
import Breadcrumb from './Breadcrumb';
import DocumentMenu from 'menus/DocumentMenu';
import Collaborators from 'components/Collaborators';
import { Action, Separator } from 'components/Actions';

type Props = {
  document: Document,
  isDraft: boolean,
  isEditing: boolean,
  isSaving: boolean,
  isPublishing: boolean,
  savingIsDisabled: boolean,
  editMode: boolean,
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

  componentWillMount() {
    this.handleScroll();
  }

  componentDidMount() {
    window.addEventListener('scroll', this.handleScroll);
  }

  componentWillUnmount() {
    window.removeEventListener('scroll', this.handleScroll);
  }

  handleScroll = () => {
    this.isScrolled = window.scrollY > 75;
  };

  handleNewDocument = () => {
    this.props.history.push(documentNewUrl(this.props.document));
  };

  handleEdit = () => {
    this.props.history.push(documentEditUrl(this.props.document));
  };

  handleSave = () => {
    this.props.onSave({ done: true });
  };

  handlePublish = () => {
    this.props.onSave({ done: true, publish: true });
  };

  render() {
    const {
      document,
      isEditing,
      isDraft,
      isPublishing,
      isSaving,
      savingIsDisabled,
      editMode,
    } = this.props;

    return (
      <Actions
        align="center"
        justify="space-between"
        editMode={editMode}
        readOnly={!isEditing}
        isCompact={this.isScrolled}
      >
        <Breadcrumb document={document} />
        <Title isHidden={!this.isScrolled}>{document.title}</Title>
        <Wrapper align="center" justify="flex-end">
          {!isDraft && !isEditing && <Collaborators document={document} />}
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
          {isEditing && (
            <React.Fragment>
              <Action>
                {isSaving && !isPublishing && <Status>Saving…</Status>}
                <Link
                  onClick={this.handleSave}
                  title="Save changes (Cmd+Enter)"
                  disabled={savingIsDisabled}
                  isSaving={isSaving}
                  highlight={!isDraft}
                >
                  Done
                </Link>
              </Action>
              {isDraft && <Separator />}
            </React.Fragment>
          )}
          {!isEditing && (
            <Action>
              <Link onClick={this.handleEdit}>Edit</Link>
            </Action>
          )}
          {isEditing &&
            !isSaving &&
            document.hasPendingChanges && (
              <Action>
                <Link onClick={this.props.onDiscard}>Discard</Link>
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
                  <a onClick={this.handleNewDocument}>
                    <NewDocumentIcon />
                  </a>
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
  margin-right: 12px;
`;

const Wrapper = styled(Flex)`
  width: 33.3%;
`;

const Actions = styled(Flex)`
  position: fixed;
  top: 0;
  right: 0;
  left: ${props => (props.editMode ? '0' : props.theme.sidebarWidth)};
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid
    ${props => (props.isCompact ? props.theme.smoke : 'transparent')};
  padding: 12px;
  transition: all 100ms ease-out;
  -webkit-backdrop-filter: blur(20px);

  @media print {
    display: none;
  }

  ${breakpoint('tablet')`
    padding: ${props =>
      props.isCompact ? '12px' : `${props.theme.padding} 0`};
  `};
`;

const Title = styled.div`
  width: 33.3%;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  justify-content: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 100ms ease-in-out;
  opacity: ${props => (props.isHidden ? '0' : '1')};
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
