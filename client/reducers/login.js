/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 08.12.17.
 */

import * as Constants from '../constants';

export default function reducer(loginState = Constants.INITIAL_LOGIN_STATE, action) {
	switch (action.type) {
		case Constants.RECEIVE_LOGIN:
			return {name: action.name, id: action.id};
		default:
			return loginState;
	}
}