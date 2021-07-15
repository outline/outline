// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { Trans } from "react-i18next";
import styled, { withTheme } from "styled-components";
import Editor from "components/Editor";
import HelpText from "components/HelpText";
import { LabelText, Outline } from "components/Input";
import useStores from "hooks/useStores";

type Props = {|
  label: string,
  minHeight?: number,
  maxHeight?: number,
  readOnly?: boolean,
|};

function InputRich({ label, minHeight, maxHeight, ...rest }: Props) {
  const [focused, setFocused] = React.useState<boolean>(false);
  const { ui } = useStores();

  const handleBlur = React.useCallback(() => {
    setFocused(false);
  }, []);

  const handleFocus = React.useCallback(() => {
    setFocused(true);
  }, []);

  return (
    <>
      <LabelText>{label}</LabelText>
      <StyledOutline
        maxHeight={maxHeight}
        minHeight={minHeight}
        focused={focused}
      >
        <React.Suspense
          fallback={
            <HelpText>
              <Trans>Loading editor</Trans>…
            </HelpText>
          }
        >
          <Editor
            onBlur={handleBlur}
            onFocus={handleFocus}
            ui={ui}
            grow
            {...rest}
          />
        </React.Suspense>
      </StyledOutline>
    </>
  );
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

export default observer(withTheme(InputRich));
