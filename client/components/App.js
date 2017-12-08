/**
 * Created by Andrew D.Laptev<a.d.laptev@gmail.com> on 08.12.17.
 */

import React, { Component } from 'react';
import { Layout } from 'antd';
import { connect } from 'react-redux';

class App extends Component {
	constructor(props) {
		super(props);
		this.state = {
			showLoginForm: false
			, showRegisterForm: false
		};
	}

	render() {
		return (
			<Layout>
			</Layout>
		)
	}
}

const mapDispatchToProps = dispatch => {
	return {};
};

const mapStateToProps = state => {
	return {};
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(App);