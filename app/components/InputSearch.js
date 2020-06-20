// @flow
import * as React from "react";
import keydown from "react-keydown";
import { observer } from "mobx-react";
import { observable } from "mobx";
import { withRouter, type RouterHistory } from "react-router-dom";
import styled, { withTheme } from "styled-components";
import { SearchIcon } from "outline-icons";
import { searchUrl } from "utils/routeHelpers";
import Input from "./Input";

type Props = {
  history: RouterHistory,
  theme: Object,
  placeholder?: string,
  collectionId?: string,
};

@observer
class InputSearch extends React.Component<Props> {
  input: ?Input;
  @observable focused: boolean = false;

  @keydown("meta+f")
  focus(ev) {
    ev.preventDefault();

    if (this.input) {
      this.input.focus();
    }
  }

  handleSearchInput = ev => {
    ev.preventDefault();
    this.props.history.push(
      searchUrl(ev.target.value, this.props.collectionId)
    );
  };

  handleFocus = () => {
    this.focused = true;
  };

  handleBlur = () => {
    this.focused = false;
  };

  render() {
    const { theme, placeholder = "Search…" } = this.props;

    return (
      <InputMaxWidth
        ref={ref => (this.input = ref)}
        type="search"
        placeholder={placeholder}
        onInput={this.handleSearchInput}
        icon={
          <SearchIcon
            color={this.focused ? theme.inputBorderFocused : theme.inputBorder}
          />
        }
        onFocus={this.handleFocus}
        onBlur={this.handleBlur}
        margin={0}
      />
    );
  }
}

const InputMaxWidth = styled(Input)`
  max-width: 30vw;
`;

export default withTheme(withRouter(InputSearch));
