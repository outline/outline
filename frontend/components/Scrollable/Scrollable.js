// @flow
import React, { Component } from 'react';
import styled from 'styled-components';

const Scroll = styled.div`
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  transform: translateZ(0);
  -webkit-overflow-scrolling: touch;
`;

class Scrollable extends Component {
  render() {
    return <Scroll {...this.props} />;
  }
}

export default Scrollable;
