import { observer } from "mobx-react";
import * as React from "react";
import { Trans } from "react-i18next";
import styled, { withTheme } from "styled-components";
import Editor from "components/Editor";
import HelpText from "components/HelpText";
import { LabelText, Outline } from "components/Input";
import useStores from "hooks/useStores";

type Props = {
  label: string;
  minHeight?: number;
  maxHeight?: number;
  readOnly?: boolean;
};

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
        // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
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
            // @ts-expect-error ts-migrate(2322) FIXME: Type '{ readOnly?: boolean | undefined; onBlur: ()... Remove this comment to see the full error message
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
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'minHeight' does not exist on type 'Pick<... Remove this comment to see the full error message
  min-height: ${({ minHeight }) => (minHeight ? `${minHeight}px` : "0")};
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'maxHeight' does not exist on type 'Pick<... Remove this comment to see the full error message
  max-height: ${({ maxHeight }) => (maxHeight ? `${maxHeight}px` : "auto")};
  overflow-y: auto;

  > * {
    display: block;
  }
`;

// @ts-expect-error ts-migrate(2345) FIXME: Argument of type '({ label, minHeight, maxHeight, ... Remove this comment to see the full error message
export default observer(withTheme(InputRich));
