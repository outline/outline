// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";

type Props = {
  shadow?: boolean,
};

@observer
class Scrollable extends React.Component<Props> {
  @observable shadow: boolean = false;

  handleScroll = (ev: SyntheticMouseEvent<HTMLDivElement>) => {
    this.shadow = !!(this.props.shadow && ev.currentTarget.scrollTop > 0);
  };

  render() {
    const { shadow, ...rest } = this.props;

    return (
      <Wrapper onScroll={this.handleScroll} shadow={this.shadow} {...rest} />
    );
  }
}

const Wrapper = styled.div`
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
  box-shadow: ${(props) =>
    props.shadow ? "0 1px inset rgba(0,0,0,.1)" : "none"};
  transition: all 250ms ease-in-out;
`;

export default Scrollable;
