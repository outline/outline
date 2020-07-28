// @flow
import * as React from "react";
import { observable } from "mobx";
import { observer } from "mobx-react";
import styled, { withTheme } from "styled-components";
import { LabelText, Outline } from "components/Input";

type Props = {
  label: string,
  minHeight?: number,
  maxHeight?: number,
  readOnly?: boolean,
};

@observer
class InputRich extends React.Component<Props> {
  @observable editorComponent: React.ComponentType<any>;
  @observable focused: boolean = false;

  componentDidMount() {
    this.loadEditor();
  }

  handleBlur = () => {
    this.focused = false;
  };

  handleFocus = () => {
    this.focused = true;
  };

  loadEditor = async () => {
    try {
      const EditorImport = await import("./Editor");
      this.editorComponent = EditorImport.default;
    } catch (err) {
      console.error(err);

      // If the editor bundle fails to load then reload the entire window. This
      // can happen if a deploy happens between the user loading the initial JS
      // bundle and the async-loaded editor JS bundle as the hash will change.
      window.location.reload();
    }
  };

  render() {
    const { label, minHeight, maxHeight, ...rest } = this.props;
    const Editor = this.editorComponent;

    return (
      <React.Fragment>
        <LabelText>{label}</LabelText>

        <StyledOutline
          maxHeight={maxHeight}
          minHeight={minHeight}
          focused={this.focused}
        >
          {Editor ? (
            <Editor
              onBlur={this.handleBlur}
              onFocus={this.handleFocus}
              grow
              {...rest}
            />
          ) : (
            "Loading…"
          )}
        </StyledOutline>
      </React.Fragment>
    );
  }
}

const StyledOutline = styled(Outline)`
  padding: 8px 12px;
  min-height: ${({ minHeight }) => (minHeight ? `${minHeight}px` : "0")};
  max-height: ${({ maxHeight }) => (maxHeight ? `${maxHeight}px` : "auto")};
  overflow-y: auto;

  > * {
    display: block;
  }
`;

export default withTheme(InputRich);
