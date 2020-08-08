// @flow
import * as React from "react";
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import { Redirect } from "react-router-dom";
import { DocumentIcon } from "outline-icons";
import styled from "styled-components";
import DocumentsStore from "stores/DocumentsStore";

import { newDocumentUrl } from "utils/routeHelpers";
import Document from "models/Document";
import Button from "components/Button";
import { DropdownMenu, DropdownMenuItem } from "components/DropdownMenu";

type Props = {
  document: Document,
  documents: DocumentsStore,
};

@observer
class TemplatesMenu extends React.Component<Props> {
  @observable redirectTo: ?string;

  componentDidUpdate() {
    this.redirectTo = undefined;
  }

  handleNewDocument = (
    collectionId: string,
    options?: {
      templateId?: string,
      parentDocumentId?: string,
      template?: boolean,
    }
  ) => {
    this.redirectTo = newDocumentUrl(collectionId, options);
  };

  render() {
    if (this.redirectTo) return <Redirect to={this.redirectTo} push />;

    const { collection, documents, document, label, ...rest } = this.props;
    const templates = documents.templatesInCollection(document.collectionId);

    return (
      <DropdownMenu
        position="left"
        label={
          <Button disclosure neutral>
            Templates
          </Button>
        }
        {...rest}
      >
        {templates.map(template => (
          <DropdownMenuItem
            key={template.id}
            onClick={() =>
              this.handleNewDocument(document.collectionId, {
                templateId: template.id,
              })
            }
          >
            <DocumentIcon />
            <div>
              <strong>{template.titleWithDefault}</strong>
              <br />
              <Author>By {template.createdBy.name}</Author>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenu>
    );
  }
}

const Author = styled.div`
  font-size: 13px;
`;

export default inject("documents")(TemplatesMenu);
