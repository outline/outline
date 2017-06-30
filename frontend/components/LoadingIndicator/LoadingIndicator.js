// @flow
import React from 'react';
import { inject, observer } from 'mobx-react';

@observer class LoadingIndicator extends React.Component {
  componentDidMount() {
    this.props.ui.enableProgressBar();
  }

  componentWillUnmount() {
    this.props.ui.disableProgressBar();
  }
}

export default inject('ui')(LoadingIndicator);
