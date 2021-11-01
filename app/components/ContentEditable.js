// @flow
import isPrintableKeyEvent from "is-printable-key-event";
import * as React from "react";
import styled from "styled-components";

type Props = {|
  disabled?: boolean,
  onChange?: (text: string) => void,
  onBlur?: (event: SyntheticInputEvent<>) => void,
  onInput?: (event: SyntheticInputEvent<>) => void,
  onKeyDown?: (event: SyntheticInputEvent<>) => void,
  placeholder?: string,
  maxLength?: number,
  autoFocus?: boolean,
  className?: string,
  children?: React.Node,
  value: string,
|};

/**
 * Defines a content editable component with the same interface as a native
 * HTMLInputElement (or, as close as we can get).
 */
function ContentEditable({
  disabled,
  onChange,
  onInput,
  onBlur,
  onKeyDown,
  value,
  children,
  className,
  maxLength,
  autoFocus,
  placeholder,
  ...rest
}: Props) {
  const ref = React.useRef<?HTMLSpanElement>();
  const [innerHTML, setInnerHTML] = React.useState<string>(value);
  const lastValue = React.useRef("");

  const wrappedEvent = (callback) => (
    event: SyntheticInputEvent<HTMLInputElement>
  ) => {
    const text = ref.current?.innerText || "";

    if (maxLength && isPrintableKeyEvent(event) && text.length >= maxLength) {
      event.preventDefault();
      return false;
    }

    if (text !== lastValue.current) {
      lastValue.current = text;
      onChange && onChange(text);
    }

    callback && callback(event);
  };

  React.useLayoutEffect(() => {
    if (autoFocus) {
      ref.current?.focus();
    }
  });

  React.useEffect(() => {
    if (value !== ref.current?.innerText) {
      setInnerHTML(value);
    }
  }, [value]);

  return (
    <div className={className}>
      <Content
        contentEditable={!disabled}
        onInput={wrappedEvent(onInput)}
        onBlur={wrappedEvent(onBlur)}
        onKeyDown={wrappedEvent(onKeyDown)}
        ref={ref}
        data-placeholder={placeholder}
        role="textbox"
        dangerouslySetInnerHTML={{ __html: innerHTML }}
        {...rest}
      />
      {children}
    </div>
  );
}

const Content = styled.span`
  &:empty {
    display: inline-block;
  }

  &:empty::before {
    display: inline-block;
    color: ${(props) => props.theme.placeholder};
    -webkit-text-fill-color: ${(props) => props.theme.placeholder};
    content: attr(data-placeholder);
    pointer-events: none;
    height: 0;
  }
`;

export default React.memo<Props>(ContentEditable);
