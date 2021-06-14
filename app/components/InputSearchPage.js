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
import { meta } from "utils/keyboard";
import { searchUrl } from "utils/routeHelpers";

type Props = {
  history: RouterHistory,
  theme: Theme,
  source: string,
  placeholder?: string,
  label?: string,
  labelHidden?: boolean,
  collectionId?: string,
  value: string,
  onChange: (event: SyntheticInputEvent<>) => mixed,
  onKeyDown: (event: SyntheticKeyboardEvent<HTMLInputElement>) => mixed,
  t: TFunction,
};

@observer
class InputSearchPage extends React.Component<Props> {
  input: ?Input;
  @observable focused: boolean = false;

  @keydown(`${meta}+f`)
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
    const { t, value, onChange, onKeyDown } = this.props;
    const { theme, placeholder = `${t("Search")}…` } = this.props;

    return (
      <InputMaxWidth
        ref={(ref) => (this.input = ref)}
        type="search"
        placeholder={placeholder}
        onInput={this.handleSearchInput}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        icon={
          <SearchIcon
            color={this.focused ? theme.inputBorderFocused : theme.inputBorder}
          />
        }
        label={this.props.label}
        onFocus={this.handleFocus}
        onBlur={this.handleBlur}
        margin={0}
        labelHidden
      />
    );
  }
}

const InputMaxWidth = styled(Input)`
  max-width: 30vw;
`;

export default withTranslation()<InputSearchPage>(
  withTheme(withRouter(InputSearchPage))
);
