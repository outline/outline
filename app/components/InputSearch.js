// @flow
import { observable } from "mobx";
import { observer } from "mobx-react";
import { SearchIcon } from "outline-icons";
import * as React from "react";
import { withTranslation, type TFunction } from "react-i18next";
import keydown from "react-keydown";
import { withRouter, type RouterHistory } from "react-router-dom";
import styled, { withTheme } from "styled-components";
import Input from "./Input";
import { type Theme } from "types";
import { searchUrl } from "utils/routeHelpers";

type Props = {
  history: RouterHistory,
  theme: Theme,
  source: string,
  placeholder?: string,
  collectionId?: string,
  t: TFunction,
};

@observer
class InputSearch extends React.Component<Props> {
  input: ?Input;
  @observable focused: boolean = false;

  @keydown("meta+f")
  focus(ev: SyntheticEvent<>) {
    ev.preventDefault();

    if (this.input) {
      this.input.focus();
    }
  }

  handleSearchInput = (ev: SyntheticInputEvent<>) => {
    ev.preventDefault();
    this.props.history.push(
      searchUrl(ev.target.value, {
        collectionId: this.props.collectionId,
        ref: this.props.source,
      })
    );
  };

  handleFocus = () => {
    this.focused = true;
  };

  handleBlur = () => {
    this.focused = false;
  };

  render() {
    const { t } = this.props;
    const { theme, placeholder = t("Search…") } = this.props;

    return (
      <InputMaxWidth
        ref={(ref) => (this.input = ref)}
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

export default withTranslation()<InputSearch>(
  withTheme(withRouter(InputSearch))
);
