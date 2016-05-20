import makeActionCreator from '../utils/actions';
import { replace } from 'react-router-redux';
import { client } from 'utils/ApiClient';

export const FETCH_DOCUMENT_PENDING = 'FETCH_DOCUMENT_PENDING';
export const FETCH_DOCUMENT_SUCCESS = 'FETCH_DOCUMENT_SUCCESS';
export const FETCH_DOCUMENT_FAILURE = 'FETCH_DOCUMENT_FAILURE';

const fetchDocumentPending = makeActionCreator(FETCH_DOCUMENT_PENDING);
const fetchDocumentSuccess = makeActionCreator(FETCH_DOCUMENT_SUCCESS, 'data');
const fetchDocumentFailure = makeActionCreator(FETCH_DOCUMENT_FAILURE, 'error');

export function fetchDocumentAsync(documentId) {
  return (dispatch) => {
    dispatch(fetchDocumentPending());

    client.post('/documents.info', {
      id: documentId,
    })
    .then(data => {
      dispatch(fetchDocumentSuccess(data.data));
    })
    .catch((err) => {
      dispatch(fetchDocumentFailure(err));
    })
  };
};

export const SAVE_DOCUMENT_PENDING = 'SAVE_DOCUMENT_PENDING';
export const SAVE_DOCUMENT_SUCCESS = 'SAVE_DOCUMENT_SUCCESS';
export const SAVE_DOCUMENT_FAILURE = 'SAVE_DOCUMENT_FAILURE';

const saveDocumentPending = makeActionCreator(SAVE_DOCUMENT_PENDING);
const saveDocumentSuccess = makeActionCreator(SAVE_DOCUMENT_SUCCESS, 'data');
const saveDocumentFailure = makeActionCreator(SAVE_DOCUMENT_FAILURE, 'error');

export function saveDocumentAsync(atlasId, documentId, title, text) {
  return (dispatch) => {
    dispatch(saveDocumentPending());

    let url;
    if (documentId) {
      url = '/documents.update'
    } else {
      url = '/documents.create'
    }

    client.post(url, {
      atlas: atlasId,
      document: documentId,
      title,
      text,
    })
    .then(data => {
      dispatch(saveDocumentSuccess(data.data, data.pagination));
      dispatch(replace(`/documents/${data.data.id}`));
    })
    .catch((err) => {
      dispatch(saveDocumentFailure(err));
    })
  };
};

