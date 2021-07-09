import { observable } from "mobx";
import { observer } from "mobx-react";
import { SearchIcon } from "outline-icons";
import * as React from "react";
import { SyntheticEvent, ChangeEvent, KeyboardEvent } from "react";
import { withTranslation, TFunction } from "react-i18next";
import keydown from "react-keydown";
import { withRouter, RouteComponentProps } from "react-router-dom";
import styled, { withTheme } from "styled-components";
import Input from "./Input";
import { Theme } from "types";
import { meta } from "utils/keyboard";
import { searchUrl } from "utils/routeHelpers";

type Props = RouteComponentProps & {
  theme: Theme;
  source: string;
  placeholder?: string;
  label?: string;
  labelHidden?: boolean;
  collectionId?: string;
  value: string;
  onChange: (event: ChangeEvent) => unknown;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => unknown;
  t: TFunction;
};

@observer
class InputSearchPage extends React.Component<Props> {
  input: Input | undefined | null;
  @observable
  focused: boolean = false;

  @keydown(`${meta}+f`)
  focus(ev: SyntheticEvent) {
    ev.preventDefault();

    if (this.input) {
      this.input.focus();
    }
  }

  handleSearchInput = (ev: ChangeEvent) => {
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
