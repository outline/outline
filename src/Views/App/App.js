import React, { Component } from 'react';
import { connect } from 'react-redux';

import 'normalize.css/normalize.css';
import styles from './App.scss';

import { toggleEditors } from '../../Actions';

import Header from '../../Components/Header';

import Auth from '../../Utils/Auth';

class App extends Component {
  static propTypes = {
    children: React.PropTypes.element,
    activeEditors: React.PropTypes.isRequired,
    toggleEditors: React.PropTypes.func.isRequired,
  }

  static defaultProps = {}

  state = {
    loggedIn: Auth.loggedIn(),
  }

  componentWillMount = () => {
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
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    toggleEditors: (toggledEditor) => {
      dispatch(toggleEditors(toggledEditor));
    },
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
