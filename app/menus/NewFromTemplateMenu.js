// @flow
import * as React from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import { Redirect } from "react-router-dom";
import { PlusIcon, DocumentIcon } from "outline-icons";
import styled from "styled-components";

import { newDocumentUrl } from "utils/routeHelpers";
import Document from "models/Document";
import Collection from "models/Collection";
import {
  DropdownMenu,
  DropdownMenuItem,
  Header,
} from "components/DropdownMenu";
import CollectionIcon from "components/CollectionIcon";

type Props = {
  label?: React.Node,
  collection: Collection,
  templates: Document[],
};

@observer
class NewFromTemplateMenu extends React.Component<Props> {
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

    const { collection, templates, label, ...rest } = this.props;

    return (
      <DropdownMenu
        position="right"
        label={
          label || (
            <DropdownMenuItem key={collection.id}>
              <CollectionIcon collection={collection} />&nbsp;{collection.name}
            </DropdownMenuItem>
          )
        }
        {...rest}
      >
        <DropdownMenuItem onClick={() => this.handleNewDocument(collection.id)}>
          <PlusIcon />
          <span>New document</span>
        </DropdownMenuItem>
        <Header>Start from a template…</Header>
        {templates.map(template => (
          <DropdownMenuItem
            key={template.id}
            onClick={() =>
              this.handleNewDocument(collection.id, {
                templateId: template.id,
              })
            }
          >
            <DocumentIcon />
            <div>
              <strong>{template.title}</strong>
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

export default NewFromTemplateMenu;
