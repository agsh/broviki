import { GET, GET_SUCCESS, GET_ERROR } from '../constants/devices';

const initialState = {
  fetching: false,
  error: null,
  list: []
};

export default function reducer(state = initialState, action) {
  switch (action.type) {
    case GET:
      console.log('GET')
      return { ...state, fetching: true, error: null };
    case GET_SUCCESS:
      return { ...state, fetching: false, list: action.list };
    case GET_ERROR:
      return { ...state, fetching: false, list: [], error: action.error };
    default:
      return state;
  }
}
