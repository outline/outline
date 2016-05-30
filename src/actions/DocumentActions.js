import makeActionCreator from '../utils/actions';
import { replace } from 'react-router-redux';
import { client } from 'utils/ApiClient';
import { createAction } from 'redux-actions';

export const resetDocument = createAction('RESET_DOCUMENT');

// GET

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

// POST/UPDATE

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
    let data = {
      title,
      text,
    };
    if (documentId) {
      url = '/documents.update';
      data.id = documentId;
    } else {
      url = '/documents.create';
      data.atlas = atlasId;
    }

    client.post(url, data)
    .then(data => {
      dispatch(saveDocumentSuccess(data.data, data.pagination));
      dispatch(replace(`/documents/${data.data.id}`));
    })
    .catch((err) => {
      dispatch(saveDocumentFailure(err));
    })
  };
};

// documents.delete

export const deleteDocumentPending = createAction('DELETE_DOCUMENT_PENDING');
export const deleteDocumentSuccess = createAction('DELETE_DOCUMENT_SUCCESS');
export const deleteDocumentFailure = createAction('DELETE_DOCUMENT_FAILURE');

export const deleteDocument = (documentId, returnPath) => {
  return (dispatch) => {
    dispatch(deleteDocumentPending());

    client.post('/documents.delete', { id: documentId })
    .then(data => {
      dispatch(deleteDocumentSuccess(documentId));
      dispatch(replace(returnPath));
    })
    .catch((err) => {
      dispatch(deleteDocumentFailure(err));
    })
  };
};
