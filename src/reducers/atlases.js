import {
  FETCH_ATLASES_PENDING,
  FETCH_ATLASES_SUCCESS,
  FETCH_ATLASES_FAILURE,
} from 'actions/AtlasActions';

const initialState = {
  items: [],
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
          items: action.items,
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
    default:
      return state;
  }
};

export default atlases;