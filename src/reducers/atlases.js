import {
  FETCH_ATLASES_PENDING,
  FETCH_ATLASES_SUCCESS,
  FETCH_ATLASES_FAILURE,

  FETCH_ATLAS_PENDING,
  FETCH_ATLAS_SUCCESS,
  FETCH_ATLAS_FAILURE,
} from 'actions/AtlasActions';

const initialState = {
  pagination: null,
  isLoading: false,
}

const atlases = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_ATLASES_PENDING: {
        return {
          ...state,
          isLoading: true,
        };
      }
    case FETCH_ATLASES_SUCCESS: {
        return {
          ...state,
          ...action.data,
          pagination: action.pagination,
          isLoading: false,
        };
      }
    case FETCH_ATLASES_FAILURE: {
        return {
          ...state,
          isLoading: false,
          error: action.error,
        };
      }

    case FETCH_ATLAS_PENDING: {
        return {
          ...state,
          isLoading: true,
        };
      }
    case FETCH_ATLAS_SUCCESS: {
        return {
          ...state,
          ...action.data,
          isLoading: false,
        };
      }
    case FETCH_ATLAS_FAILURE: {
        return {
          ...state,
          isLoading: false,
          error: action.error,
        };
      }

    default:
      return state;
  }
};

export default atlases;