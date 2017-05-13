// @flow
import { observable, action } from 'mobx';
import { browserHistory } from 'react-router';
import get from 'lodash/get';
import invariant from 'invariant';
import { client } from 'utils/ApiClient';
import emojify from 'utils/emojify';
import type { Document } from 'types';

type SaveProps = { redirect?: boolean };

const parseHeader = text => {
  const firstLine = text.split(/\r?\n/)[0];
  if (firstLine) {
    const match = firstLine.match(/^#+ +(.*)$/);

    if (match) {
      return emojify(match[1]);
    } else {
      return '';
    }
  }
  return '';
};

class DocumentEditStore {
  @observable documentId = null;
  @observable collectionId = null;
  @observable parentDocument: ?Document;
  @observable title: string;
  @observable text: string;
  @observable hasPendingChanges = false;
  @observable newDocument: ?boolean;
  @observable newChildDocument: ?boolean;

  @observable isFetching: boolean = false;
  @observable isSaving: boolean = false;

  /* Actions */

  @action fetchDocument = async () => {
    this.isFetching = true;

    try {
      const res = await client.get(
        '/documents.info',
        {
          id: this.documentId,
        },
        { cache: true }
      );
      invariant(res && res.data, 'Data should be available');
      if (this.newChildDocument) {
        this.parentDocument = res.data;
      } else {
        const { title, text } = res.data;
        this.title = title;
        this.text = text;
      }
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isFetching = false;
  };

  @action saveDocument = async ({ redirect = true }: SaveProps) => {
    if (this.isSaving) return;

    this.isSaving = true;

    try {
      const res = await client.post(
        '/documents.create',
        {
          parentDocument: get(this.parentDocument, 'id'),
          // $FlowFixMe this logic will probably get rewritten soon anyway
          collection: this.collectionId || this.parentDocument.collection.id,
          title: this.title || 'Untitled document',
          text: this.text,
        },
        { cache: true }
      );
      invariant(res && res.data, 'Data should be available');
      const { url } = res.data;

      this.hasPendingChanges = false;
      if (redirect) browserHistory.push(url);
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isSaving = false;
  };

  @action updateDocument = async ({ redirect = true }: SaveProps) => {
    if (this.isSaving) return;

    this.isSaving = true;

    try {
      const res = await client.post(
        '/documents.update',
        {
          id: this.documentId,
          title: this.title || 'Untitled document',
          text: this.text,
        },
        { cache: true }
      );
      invariant(res && res.data, 'Data should be available');
      const { url } = res.data;

      this.hasPendingChanges = false;
      if (redirect) browserHistory.push(url);
    } catch (e) {
      console.error('Something went wrong');
    }
    this.isSaving = false;
  };

  @action updateText = (text: string) => {
    this.text = text;
    this.title = parseHeader(text);

    console.log('updateText', text);
    this.hasPendingChanges = true;
  };

  @action updateTitle = (title: string) => {
    this.title = title;
  };
}

export default DocumentEditStore;
