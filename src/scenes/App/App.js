import React, { Component } from 'react';
import { connect } from 'react-redux';

import 'normalize.css/normalize.css';
import '../../fonts/atlas/atlas.css';
import styles from './App.scss';

import {
  toggleEditors,
  addRevision,
 } from '../../actions';

import Header from '../../components/Header';
import Editor from '../../components/Editor';

class App extends Component {
  static propTypes = {
    children: React.PropTypes.element,
    addRevision: React.PropTypes.func.isRequired,
    unsavedChanges: React.PropTypes.bool.isRequired,
  }

  render() {
    return (
      <div className={ styles.container }>
        <Header
          activeEditors={this.props.activeEditors}
          addRevision={this.props.addRevision}
          unsavedChanges={this.props.unsavedChanges}
        />
        <div className={ styles.content }>
          <Editor />
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeEditors: state.activeEditors,
    unsavedChanges: state.text.unsavedChanges,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addRevision: () => {
      dispatch(addRevision());
    },
  };
};

App = connect(
  mapStateToProps,
  mapDispatchToProps,
)(App);

export default App;
