import isPrintableKeyEvent from "is-printable-key-event";
import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import useOnScreen from "~/hooks/useOnScreen";

type Props = Omit<React.HTMLAttributes<HTMLSpanElement>, "ref" | "onChange"> & {
  disabled?: boolean;
  readOnly?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  onChange?: (text: string) => void;
  onFocus?: React.FocusEventHandler<HTMLSpanElement> | undefined;
  onBlur?: React.FocusEventHandler<HTMLSpanElement> | undefined;
  onInput?: React.FormEventHandler<HTMLSpanElement> | undefined;
  onKeyDown?: React.KeyboardEventHandler<HTMLSpanElement> | undefined;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  children?: React.ReactNode;
  value: string;
};

export type RefHandle = {
  focus: () => void;
  focusAtStart: () => void;
  focusAtEnd: () => void;
  getComputedDirection: () => string;
};

/**
 * Defines a content editable component with the same interface as a native
 * HTMLInputElement (or, as close as we can get).
 */
const ContentEditable = React.forwardRef(function _ContentEditable(
  {
    disabled,
    onChange,
    onInput,
    onFocus,
    onBlur,
    onKeyDown,
    value,
    children,
    className,
    maxLength,
    autoFocus,
    placeholder,
    readOnly,
    dir,
    onClick,
    ...rest
  }: Props,
  ref: React.RefObject<RefHandle>
) {
  const contentRef = React.useRef<HTMLSpanElement>(null);
  const [innerValue, setInnerValue] = React.useState<string>(value);
  const lastValue = React.useRef(value);

  React.useImperativeHandle(ref, () => ({
    focus: () => {
      if (contentRef.current) {
        contentRef.current.focus();
        // looks unnecessary but required because of https://github.com/outline/outline/issues/5198
        if (!contentRef.current.innerText) {
          placeCaret(contentRef.current, true);
        }
      }
    },
    focusAtStart: () => {
      if (contentRef.current) {
        contentRef.current.focus();
        placeCaret(contentRef.current, true);
      }
    },
    focusAtEnd: () => {
      if (contentRef.current) {
        contentRef.current.focus();
        placeCaret(contentRef.current, false);
      }
    },
    getComputedDirection: () => {
      if (contentRef.current) {
        return window.getComputedStyle(contentRef.current).direction;
      }
      return "ltr";
    },
  }));

  const wrappedEvent =
    (
      callback:
        | React.FocusEventHandler<HTMLSpanElement>
        | React.FormEventHandler<HTMLSpanElement>
        | React.KeyboardEventHandler<HTMLSpanElement>
        | undefined
    ) =>
    (event: any) => {
      if (readOnly) {
        return;
      }

      const text = event.currentTarget.textContent || "";

      if (maxLength && isPrintableKeyEvent(event) && text.length >= maxLength) {
        event?.preventDefault();
        return;
      }

      if (text !== lastValue.current) {
        lastValue.current = text;
        onChange?.(text);
      }

      callback?.(event);
    };

  // This is to account for being within a React.Suspense boundary, in this
  // case the component may be rendered with display: none. React 18 may solve
  // this in the future by delaying useEffect hooks:
  // https://github.com/facebook/react/issues/14536#issuecomment-861980492
  const isVisible = useOnScreen(contentRef);

  React.useEffect(() => {
    if (autoFocus && isVisible && !disabled && !readOnly) {
      contentRef.current?.focus();
    }
  }, [autoFocus, disabled, isVisible, readOnly, contentRef]);

  React.useEffect(() => {
    if (contentRef.current && value !== contentRef.current.textContent) {
      setInnerValue(value);
    }
  }, [value, contentRef]);

  // Ensure only plain text can be pasted into input when pasting from another
  // rich text source. Note: If `onPaste` prop is passed then it takes
  // priority over this behavior.
  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLSpanElement>) => {
      event.preventDefault();
      const text = event.clipboardData.getData("text/plain");
      window.document.execCommand("insertText", false, text);
    },
    []
  );

  return (
    <div className={className} dir={dir} onClick={onClick} tabIndex={-1}>
      {children}
      <Content
        ref={contentRef}
        contentEditable={!disabled && !readOnly}
        onInput={wrappedEvent(onInput)}
        onFocus={wrappedEvent(onFocus)}
        onBlur={wrappedEvent(onBlur)}
        onKeyDown={wrappedEvent(onKeyDown)}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        role="textbox"
        {...rest}
      >
        {innerValue}
      </Content>
    </div>
  );
});

function placeCaret(element: HTMLElement, atStart: boolean) {
  if (
    typeof window.getSelection !== "undefined" &&
    typeof document.createRange !== "undefined"
  ) {
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(atStart);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }
}

const Content = styled.span`
  background: ${s("background")};
  color: ${s("text")};
  -webkit-text-fill-color: ${s("text")};
  outline: none;
  resize: none;
  cursor: text;
  word-break: anywhere;

  &:empty {
    display: inline-block;
  }

  &:empty::before {
    display: inline-block;
    color: ${s("placeholder")};
    -webkit-text-fill-color: ${s("placeholder")};
    content: attr(data-placeholder);
    pointer-events: none;
    height: 0;
  }
`;

export default ContentEditable;
