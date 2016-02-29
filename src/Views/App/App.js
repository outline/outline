import React, { Component } from 'react';
import { connect } from 'react-redux';

import 'normalize.css/normalize.css';
import styles from './App.scss';

import {
  toggleEditors,
  toggleHistorySidebar,
 } from '../../Actions';

import Header from '../../Components/Header';

import Auth from '../../Utils/Auth';

class App extends Component {
  static propTypes = {
    children: React.PropTypes.element,
    activeEditors: React.PropTypes.array.isRequired,
    toggleEditors: React.PropTypes.func.isRequired,
    showHistorySidebar: React.PropTypes.bool.isRequired,
    toggleHistorySidebar: React.PropTypes.func.isRequired,
  }

  state = {
    loggedIn: Auth.loggedIn(),
  }

  componentWillMount = () => {
    console.log(this.props);
    Auth.onChange = this.updateAuth;
  }

  updateAuth = (loggedIn) => {
    this.setState({
      loggedIn,
    });
  }

  logout = () => {
    // TODO: Replace with Redux actions
    Auth.logout();
  }

  render() {
    return (
      <div className={ styles.container }>
        <Header
          activeEditors={this.props.activeEditors}
          toggleEditors={this.props.toggleEditors}
          showHistorySidebar={this.props.showHistorySidebar}
          toggleHistorySidebar={this.props.toggleHistorySidebar}
        />
        <div className={ styles.content }>
          { this.props.children }
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeEditors: state.activeEditors,
    showHistorySidebar: state.historySidebar.visible,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    toggleEditors: (toggledEditor) => {
      dispatch(toggleEditors(toggledEditor));
    },
    toggleHistorySidebar: () => {
      dispatch(toggleHistorySidebar());
    }
  };
};

App = connect(
  mapStateToProps,
  mapDispatchToProps,
)(App);

export default App;

// {this.state.loggedIn ? (
//   <a href="#" onClick={this.logout}>Logout</a>
// ) : (
//   <Link to="/login">Login</Link>
// )}
