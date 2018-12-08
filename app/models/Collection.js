// @flow
import { pick } from 'lodash';
import { action, computed } from 'mobx';
import BaseModel from 'models/BaseModel';
import Document from 'models/Document';
import { client } from 'utils/ApiClient';
import type { NavigationNode } from 'types';

export default class Collection extends BaseModel {
  isSaving: boolean;

  id: string;
  name: string;
  description: string;
  color: string;
  type: 'atlas' | 'journal';
  documents: NavigationNode[];
  createdAt: ?string;
  updatedAt: ?string;
  url: string;

  @computed
  get isEmpty(): boolean {
    return this.documents.length === 0;
  }

  @computed
  get documentIds(): string[] {
    const results = [];
    const travelDocuments = (documentList, path) =>
      documentList.forEach(document => {
        results.push(document.id);
        travelDocuments(document.children);
      });

    travelDocuments(this.documents);
    return results;
  }

  @action
  updateDocument(document: Document) {
    const travelDocuments = (documentList, path) =>
      documentList.forEach(d => {
        if (d.id === document.id) {
          d.title = document.title;
          d.url = document.url;
        } else {
          travelDocuments(d.children);
        }
      });

    travelDocuments(this.documents);
  }

  toJS = () => {
    return pick(this, ['name', 'color', 'description']);
  };

  export = () => {
    return client.post('/collections.export', { id: this.id });
  };
}
