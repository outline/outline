import {
  FETCH_DOCUMENT_PENDING,
  FETCH_DOCUMENT_SUCCESS,
  FETCH_DOCUMENT_FAILURE,

  SAVE_DOCUMENT_PENDING,
  SAVE_DOCUMENT_SUCCESS,
  SAVE_DOCUMENT_FAILURE,
} from 'actions/DocumentActions';

const initialState = {
  data: null,
  error: null,
  isLoading: false,
}

const doc = (state = initialState, action) => {
  switch (action.type) {
    case FETCH_DOCUMENT_PENDING: {
        return {
          ...state,
          isLoading: true,
        };
      }
    case FETCH_DOCUMENT_SUCCESS: {
        return {
          data: action.data,
          isLoading: false,
        };
      }
    case FETCH_DOCUMENT_FAILURE: {
        return {
          ...state,
          error: action.error,
          isLoading: false,
        };
      }

    case SAVE_DOCUMENT_PENDING: {
        return {
          ...state,
          isLoading: true,
        };
      }
    case SAVE_DOCUMENT_SUCCESS: {
        return {
          data: action.date,
          isLoading: false,
        };
      }
    case SAVE_DOCUMENT_FAILURE: {
        return {
          ...state,
          error: action.error,
          isLoading: false,
        };
      }
    default:
      return state;
  }
};

export default doc;