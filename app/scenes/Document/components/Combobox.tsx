import { observer } from "mobx-react";
import * as React from "react";
import {
  unstable_useComboboxState as useComboboxState,
  unstable_Combobox as ComboboxInput,
  unstable_ComboboxPopover as ComboboxPopover,
  unstable_ComboboxOption as ComboboxOption,
} from "reakit/Combobox";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s, ellipsis } from "@shared/styles";
import { Background, Placement } from "~/components/ContextMenu";
import { MenuAnchorCSS } from "~/components/ContextMenu/MenuItem";
import { LabelText, Outline, Wrapper } from "~/components/Input";
import { Positioner } from "~/components/InputSelect";
import { undraggableOnDesktop } from "~/styles";

type Suggestion = {
  id: string;
  value: string;
  [key: string]: any;
};

type Option = Omit<Suggestion, "value">;

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "list"> & {
  /** All possible suggestions, populated as search result options */
  suggestions: Suggestion[];
  /** Value held by the search input bar */
  value: string;
  /** Label for search input */
  label: string;
  /** Label for the search results list */
  listLabel: string;
  /** Handler which triggers upon search input change */
  onChangeInput: (value: string) => void;
  /** Handler which triggers when one of the search result options is selected */
  onSelectOption: (option: Option) => void;
};

function Combobox({
  suggestions = [],
  value,
  label,
  listLabel,
  onChangeInput,
  onSelectOption,
  ...rest
}: Props) {
  const [focused, setFocused] = React.useState(false);
  const [items, setItems] = React.useState(suggestions);

  const handleBlur = () => {
    setFocused(false);
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    onChangeInput(ev.target.value);
  };

  const state = useComboboxState({
    gutter: 8,
    values: suggestions.map((s) => s.value),
  });

  React.useEffect(() => {
    setItems(suggestions.filter((s) => state.matches.includes(s.value)));
  }, [state.matches, suggestions]);

  return (
    <>
      <Wrapper>
        <label>
          {label && <LabelText>{label}</LabelText>}
          <Outline focused={focused}>
            <StyledComboboxInput
              {...state}
              onBlur={handleBlur}
              onFocus={handleFocus}
              onChange={handleChange}
              type="search"
              {...rest}
            />
          </Outline>
        </label>
      </Wrapper>
      <ComboboxPopover {...state} aria-label={listLabel}>
        {(
          props: React.HTMLAttributes<HTMLDivElement> & {
            placement: Placement;
          }
        ) => {
          const topAnchor = props.style?.top === "0";
          const rightAnchor = props.placement === "bottom-end";

          if (!items.length) {
            return null;
          }

          return (
            <StyledPositioner {...props}>
              <Background
                dir="auto"
                topAnchor={topAnchor}
                rightAnchor={rightAnchor}
                hiddenScrollbars
                style={{ maxWidth: "100%" }}
              >
                {state.visible
                  ? items.map((item) => (
                      <StyledComboboxOption
                        {...state}
                        value={item.value}
                        key={item.id}
                        onClick={() => onSelectOption(item)}
                      >
                        {item.value}
                      </StyledComboboxOption>
                    ))
                  : null}
              </Background>
            </StyledPositioner>
          );
        }}
      </ComboboxPopover>
    </>
  );
}

const StyledComboboxInput = styled(ComboboxInput)`
  border: 0;
  flex: 1;
  padding: 8px 12px 8px;
  outline: none;
  background: none;
  color: ${s("text")};
  height: 30px;
  min-width: 0;
  font-size: 15px;

  ${ellipsis()}
  ${undraggableOnDesktop()}

  &:disabled,
  &::placeholder {
    color: ${s("placeholder")};
  }

  &:-webkit-autofill,
  &:-webkit-autofill:hover,
  &:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0px 1000px ${s("background")} inset;
  }

  &::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }

  ${breakpoint("mobile", "tablet")`
    font-size: 16px;
  `};
`;

const StyledComboboxOption = styled(ComboboxOption)`
  ${MenuAnchorCSS}
  /* overriding the styles from MenuAnchorCSS because we use &nbsp; here */
  svg:not(:last-child) {
    margin-right: 0px;
  }
`;

const StyledPositioner = styled(Positioner)`
  width: 100%;
`;

export default observer(Combobox);
