/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 08.12.17.
 */

import { combineReducers } from 'redux';

import login from './login';

const rootReducer = combineReducers({
	login
});

export default rootReducer;