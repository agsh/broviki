import React, { Component } from 'react';
import { connect } from "react-redux";

import logo from '../../logo.svg';
import './App.css';
import Dashboard from '../Dashboard/Dashboard';

class App extends Component {
  render() {
      console.log('props', this.props);
    const { fetching, dog, onRequestDog, error } = this.props;
    return (
        <div>
          <div>
            <img src={dog || logo} className="App-logo" alt="logo" />
            {fetching ?
                (<button disabled>Fetching...</button>) :
                (<button onClick={onRequestDog}>Request a Dog</button>)
            }
          </div>
          <Dashboard/>
        </div>
    );
  }
}

const mapStateToProps = state => {
  return state.dog
  /*return {
    fetching: state.fetching,
    dog: state.dog,
    error: state.error
  };*/
};

const mapDispatchToProps = dispatch => {
  return {
    onRequestDog: () => dispatch({ type: "API_CALL_REQUEST" })
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(App);
