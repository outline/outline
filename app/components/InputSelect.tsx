import {
  Select,
  SelectOption,
  useSelectState,
  useSelectPopover,
  SelectPopover,
} from "@renderlesskit/react";
import { CheckmarkIcon } from "outline-icons";
import * as React from "react";
import { VisuallyHidden } from "reakit/VisuallyHidden";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import styled, { css } from "styled-components";
import Button, { Inner } from "components/Button";
import HelpText from "components/HelpText";
import { Position, Background, Backdrop } from "./ContextMenu";
import { MenuAnchorCSS } from "./ContextMenu/MenuItem";
import { LabelText } from "./Input";
import useMenuHeight from "hooks/useMenuHeight";

export type Option = {
  label: string;
  value: string;
};

export type Props = {
  value?: string;
  label?: string;
  nude?: boolean;
  ariaLabel: string;
  short?: boolean;
  disabled?: boolean;
  className?: string;
  labelHidden?: boolean;
  icon?: React.ReactNode;
  options: Option[];
  note?: React.ReactNode;
  onChange: (arg0: string) => Promise<void> | void;
};

// @ts-expect-error ts-migrate(7006) FIXME: Parameter 'value' implicitly has an 'any' type.
const getOptionFromValue = (options: Option[], value) => {
  return options.find((option) => option.value === value);
};

const InputSelect = (props: Props) => {
  const {
    value,
    label,
    className,
    labelHidden,
    options,
    short,
    ariaLabel,
    onChange,
    disabled,
    note,
    icon,
  } = props;

  const select = useSelectState({
    gutter: 0,
    modal: true,
    selectedValue: value,
    animated: 200,
  });

  const popOver = useSelectPopover({
    ...select,
    hideOnClickOutside: true,
    preventBodyScroll: true,
    disabled,
  });

  const previousValue = React.useRef(value);
  const contentRef = React.useRef();
  const selectedRef = React.useRef();
  const buttonRef = React.useRef();
  const [offset, setOffset] = React.useState(0);
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'offsetWidth' does not exist on type 'nev... Remove this comment to see the full error message
  const minWidth = buttonRef.current?.offsetWidth || 0;
  const maxHeight = useMenuHeight(
    select.visible,
    select.unstable_disclosureRef
  );

  React.useEffect(() => {
    if (previousValue.current === select.selectedValue) return;
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string | null' is not assignable to type 'st... Remove this comment to see the full error message
    previousValue.current = select.selectedValue;

    async function load() {
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string | null' is not assignable... Remove this comment to see the full error message
      await onChange(select.selectedValue);
    }

    load();
  }, [onChange, select.selectedValue]);
  const wrappedLabel = <LabelText>{label}</LabelText>;
  const selectedValueIndex = options.findIndex(
    (option) => option.value === select.selectedValue
  );

  // Ensure selected option is visible when opening the input
  React.useEffect(() => {
    if (!select.animating && selectedRef.current) {
      scrollIntoView(selectedRef.current, {
        scrollMode: "if-needed",
        behavior: "auto",
        block: "start",
      });
    }
  }, [select.animating]);

  React.useLayoutEffect(() => {
    if (select.visible) {
      const offset = Math.round(
        // @ts-expect-error ts-migrate(2339) FIXME: Property 'getBoundingClientRect' does not exist on... Remove this comment to see the full error message
        (selectedRef.current?.getBoundingClientRect().top || 0) -
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'getBoundingClientRect' does not exist on... Remove this comment to see the full error message
          (contentRef.current?.getBoundingClientRect().top || 0)
      );
      setOffset(offset);
    }
  }, [select.visible]);

  return (
    <>
      <Wrapper short={short}>
        {label &&
          (labelHidden ? (
            <VisuallyHidden>{wrappedLabel}</VisuallyHidden>
          ) : (
            wrappedLabel
          ))}

        <Select {...select} disabled={disabled} ref={buttonRef}>
          {(props) => (
            <StyledButton
              neutral
              disclosure
              className={className}
              icon={icon}
              {...props}
            >
              {getOptionFromValue(options, select.selectedValue)?.label || (
                <Placeholder>Select a {ariaLabel.toLowerCase()}</Placeholder>
              )}
            </StyledButton>
          )}
        </Select>
        <SelectPopover {...select} {...popOver} aria-label={ariaLabel}>
          {(props) => {
            // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
            const topAnchor = props.style.top === "0";
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'placement' does not exist on type 'Extra... Remove this comment to see the full error message
            const rightAnchor = props.placement === "bottom-end";

            // offset top of select to place selected item under the cursor
            if (selectedValueIndex !== -1) {
              // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
              props.style.top = `-${offset + 32}px`;
            }

            return (
              <Positioner {...props}>
                <Background
                  dir="auto"
                  // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
                  ref={contentRef}
                  topAnchor={topAnchor}
                  rightAnchor={rightAnchor}
                  style={
                    maxHeight && topAnchor
                      ? {
                          maxHeight,
                          minWidth,
                        }
                      : {
                          minWidth,
                        }
                  }
                >
                  {select.visible || select.animating
                    ? options.map((option) => (
                        <StyledSelectOption
                          {...select}
                          value={option.value}
                          key={option.value}
                          // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
                          animating={select.animating}
                          ref={
                            select.selectedValue === option.value
                              ? selectedRef
                              : undefined
                          }
                        >
                          {select.selectedValue !== undefined && (
                            <>
                              {select.selectedValue === option.value ? (
                                <CheckmarkIcon color="currentColor" />
                              ) : (
                                <Spacer />
                              )}
                              &nbsp;
                            </>
                          )}
                          {option.label}
                        </StyledSelectOption>
                      ))
                    : null}
                </Background>
              </Positioner>
            );
          }}
        </SelectPopover>
      </Wrapper>
      {note && <HelpText small>{note}</HelpText>}
      {(select.visible || select.animating) && <Backdrop />}
    </>
  );
};

const Placeholder = styled.span`
  color: ${(props) => props.theme.placeholder};
`;

const Spacer = styled.div`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const StyledButton = styled(Button)<{ nude?: boolean }>`
  font-weight: normal;
  text-transform: none;
  margin-bottom: 16px;
  display: block;
  width: 100%;

  ${(props) =>
    props.nude &&
    css`
      border-color: transparent;
      box-shadow: none;
    `}

  ${Inner} {
    line-height: 28px;
    padding-left: 16px;
    padding-right: 8px;
  }

  svg {
    justify-self: flex-end;
    margin-left: auto;
  }
`;

export const StyledSelectOption = styled(SelectOption)`
  ${MenuAnchorCSS}

  ${(props) =>
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'animating' does not exist on type 'Theme... Remove this comment to see the full error message
    props.animating &&
    css`
      pointer-events: none;
    `}
`;

const Wrapper = styled.label<{ short?: boolean }>`
  display: block;
  max-width: ${(props) => (props.short ? "350px" : "100%")};
`;

const Positioner = styled(Position)`
  &.focus-visible {
    ${StyledSelectOption} {
      &[aria-selected="true"] {
        color: ${(props) => props.theme.white};
        background: ${(props) => props.theme.primary};
        box-shadow: none;
        cursor: pointer;

        svg {
          fill: ${(props) => props.theme.white};
        }
      }
    }
  }
`;

export default InputSelect;
