// @flow
import * as React from 'react';
import styled from 'styled-components';
import { NewDocumentIcon } from 'outline-icons';
import Document from 'models/Document';
import { documentEditUrl, documentNewUrl } from 'utils/routeHelpers';

import DocumentMenu from 'menus/DocumentMenu';
import Collaborators from 'components/Collaborators';
import Actions, { Action, Separator } from 'components/Actions';

type Props = {
  document: Document,
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

class DocumentActions extends React.Component<Props> {
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
    } = this.props;

    return (
      <Actions align="center" justify="flex-end" readOnly={!isEditing}>
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
              <Link
                onClick={this.handleSave}
                title="Save changes (Cmd+Enter)"
                disabled={savingIsDisabled}
                isSaving={isSaving}
                highlight={!isDraft}
              >
                {isSaving && !isPublishing ? 'Saving…' : 'Save'}
              </Link>
            </Action>
            {isDraft && <Separator />}
          </React.Fragment>
        )}
        {!isEditing && (
          <Action>
            <a onClick={this.handleEdit}>Edit</a>
          </Action>
        )}
        {isEditing && (
          <Action>
            <a onClick={this.props.onDiscard}>
              {document.hasPendingChanges ? 'Discard' : 'Done'}
            </a>
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
      </Actions>
    );
  }
}

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

export default DocumentActions;
