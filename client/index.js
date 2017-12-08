/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 08.12.17.
 */

import './styles/index.less';
import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { createLogger } from 'redux-logger';
import { Provider } from 'react-redux';
import { LocaleProvider } from 'antd';
import enGB from 'antd/lib/locale-provider/en_GB';
import App from './components/App';
import reducers from './reducers';

const middleware = [ thunk, createLogger() ];
export const store = createStore(reducers, applyMiddleware(...middleware));
const rootEl = document.getElementById('root');

const render = () => ReactDOM.render(
	<Provider store={store}>
		<LocaleProvider locale={enGB}>
			<App />
		</LocaleProvider>
	</Provider>,
	rootEl
);

render();
