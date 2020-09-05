// @flow
import { observable } from "mobx";
import { observer, inject } from "mobx-react";
import * as React from "react";
import styled, { withTheme } from "styled-components";
import UiStore from "stores/UiStore";
import Editor from "components/Editor";
import HelpText from "components/HelpText";
import { LabelText, Outline } from "components/Input";

type Props = {
  label: string,
  minHeight?: number,
  maxHeight?: number,
  readOnly?: boolean,
  ui: UiStore,
};

@observer
class InputRich extends React.Component<Props> {
  @observable editorComponent: React.ComponentType<any>;
  @observable focused: boolean = false;

  handleBlur = () => {
    this.focused = false;
  };

  handleFocus = () => {
    this.focused = true;
  };

  render() {
    const { label, minHeight, maxHeight, ui, ...rest } = this.props;

    return (
      <>
        <LabelText>{label}</LabelText>
        <StyledOutline
          maxHeight={maxHeight}
          minHeight={minHeight}
          focused={this.focused}
        >
          <React.Suspense fallback={<HelpText>Loading editor…</HelpText>}>
            <Editor
              onBlur={this.handleBlur}
              onFocus={this.handleFocus}
              ui={ui}
              grow
              {...rest}
            />
          </React.Suspense>
        </StyledOutline>
      </>
    );
  }
}

const StyledOutline = styled(Outline)`
  display: block;
  padding: 8px 12px;
  min-height: ${({ minHeight }) => (minHeight ? `${minHeight}px` : "0")};
  max-height: ${({ maxHeight }) => (maxHeight ? `${maxHeight}px` : "auto")};
  overflow-y: auto;

  > * {
    display: block;
  }
`;

export default inject("ui")(withTheme(InputRich));
