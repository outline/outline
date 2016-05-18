import makeActionCreator from '../utils/actions';
import { client } from 'utils/ApiClient';
import { normalize, Schema, arrayOf } from 'normalizr';

const atlas = new Schema('atlases');

export const FETCH_ATLASES_PENDING = 'FETCH_ATLASES_PENDING';
export const FETCH_ATLASES_SUCCESS = 'FETCH_ATLASES_SUCCESS';
export const FETCH_ATLASES_FAILURE = 'FETCH_ATLASES_FAILURE';

const fetchAtlasesPending = makeActionCreator(FETCH_ATLASES_PENDING);
const fetchAtlasesSuccess = makeActionCreator(FETCH_ATLASES_SUCCESS, 'data', 'pagination');
const fetchAtlasesFailure = makeActionCreator(FETCH_ATLASES_FAILURE, 'error');

export function fetchAtlasesAsync(teamId) {
  return (dispatch) => {
    dispatch(fetchAtlasesPending());

    client.post('/atlases.list', {
      teamId: teamId,
    })
    .then(data => {
      const response = normalize(data.data, arrayOf(atlas));

      dispatch(fetchAtlasesSuccess(response, data.pagination));
    })
    .catch((err) => {
      dispatch(fetchAtlasesFailure(err));
    })
  };
};



export const FETCH_ATLAS_PENDING = 'FETCH_ATLAS_PENDING';
export const FETCH_ATLAS_SUCCESS = 'FETCH_ATLAS_SUCCESS';
export const FETCH_ATLAS_FAILURE = 'FETCH_ATLAS_FAILURE';

const fetchAtlasPending = makeActionCreator(FETCH_ATLAS_PENDING);
const fetchAtlasSuccess = makeActionCreator(FETCH_ATLAS_SUCCESS, 'data');
const fetchAtlasFailure = makeActionCreator(FETCH_ATLAS_FAILURE, 'error');

export function fetchAtlasAsync(atlasId) {
  return (dispatch) => {
    dispatch(fetchAtlasPending());

    client.post('/atlases.info', {
      id: atlasId,
    })
    .then(data => {
      const response = normalize(data.data, atlas);

      dispatch(fetchAtlasSuccess(response));
    })
    .catch((err) => {
      dispatch(fetchAtlasFailure(err));
    })
  };
};