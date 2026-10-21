import isPrintableKeyEvent from "is-printable-key-event";
import * as React from "react";
import { useMergeRefs } from "react-merge-refs";
import styled from "styled-components";
import { s } from "@shared/styles";
import { TextHelper } from "@shared/utils/TextHelper";
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
  onCompositionEnd?: React.CompositionEventHandler<HTMLSpanElement> | undefined;
  placeholder?: string;
  maxLength?: number;
  autoFocus?: boolean;
  children?: React.ReactNode;
  value: string;
  ref?: React.Ref<RefHandle>;
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
function ContentEditable({
  disabled,
  onChange,
  onInput,
  onFocus,
  onBlur,
  onKeyDown,
  onCompositionEnd,
  value,
  children,
  className,
  maxLength,
  autoFocus,
  placeholder,
  readOnly,
  dir,
  onClick,
  ref,
  ...rest
}: Props) {
  const contentRef = React.useRef<HTMLSpanElement>(null);
  const [innerValue, setInnerValue] = React.useState<string>(value);
  const [isEmpty, setIsEmpty] = React.useState(value.length === 0);
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
    <E extends React.SyntheticEvent<HTMLSpanElement>>(
      callback: ((event: E) => void) | undefined
    ) =>
    (event: E) => {
      if (readOnly) {
        return;
      }

      let text = event.currentTarget.textContent || "";
      setIsEmpty(text.length === 0);
      const overLimit =
        !!maxLength && TextHelper.codePointLength(text) > maxLength;

      if (
        maxLength &&
        event.nativeEvent instanceof KeyboardEvent &&
        isPrintableKeyEvent(event.nativeEvent) &&
        TextHelper.codePointLength(text) >= maxLength
      ) {
        event.preventDefault();
        return;
      }

      // Paste, drop, IME and other non-keyboard input paths bypass the check
      // above, so clamp whatever landed in the DOM. Editing the DOM would
      // break an active IME session, so wait for composition end and do not
      // publish the over-limit buffer in the meantime.
      if (overLimit && maxLength) {
        if (isComposing(event)) {
          callback?.(event);
          return;
        }
        text = truncateContent(event.currentTarget, maxLength);
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
  const [onScreenRef, isVisible] = useOnScreen();
  const mergedRef = useMergeRefs([contentRef, onScreenRef]);

  React.useEffect(() => {
    if (autoFocus && isVisible && !disabled && !readOnly) {
      contentRef.current?.focus();
    }
  }, [autoFocus, disabled, isVisible, readOnly, contentRef]);

  React.useEffect(() => {
    if (!contentRef.current) {
      return;
    }

    const isFocused = document.activeElement === contentRef.current;
    setIsEmpty(
      isFocused ? !contentRef.current.textContent : value.length === 0
    );

    if (value !== contentRef.current.textContent) {
      if (isFocused) {
        // Don't reset content while the user is actively editing. Update
        // lastValue so that the next input or blur event will push the
        // current DOM text back to the model via onChange.
        lastValue.current = value;
      } else {
        setInnerValue(value);
      }
    }
  }, [value, contentRef]);

  // Ensure only plain text can be pasted into input when pasting from another
  // rich text source. Note: If `onPaste` prop is passed then it takes
  // priority over this behavior.
  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLSpanElement>) => {
      event.preventDefault();
      let text = event.clipboardData.getData("text/plain");

      if (maxLength) {
        const current = event.currentTarget.textContent || "";
        const selected = window.getSelection()?.toString() || "";
        const remaining =
          maxLength -
          (TextHelper.codePointLength(current) -
            TextHelper.codePointLength(selected));
        text = TextHelper.truncate(text, remaining);
      }

      window.document.execCommand("insertText", false, text);
    },
    [maxLength]
  );
  const contentEditable = !disabled && !readOnly;

  return (
    <div className={className} dir={dir} onClick={onClick} tabIndex={-1}>
      {children}
      <Content
        ref={mergedRef}
        contentEditable={contentEditable}
        onInput={wrappedEvent(onInput)}
        onFocus={wrappedEvent(onFocus)}
        onBlur={wrappedEvent(onBlur)}
        onKeyDown={wrappedEvent(onKeyDown)}
        onCompositionEnd={wrappedEvent(onCompositionEnd)}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        data-empty={isEmpty}
        suppressContentEditableWarning
        role={contentEditable ? "textbox" : undefined}
        {...rest}
      >
        {innerValue}
      </Content>
    </div>
  );
}

function isComposing(event: React.SyntheticEvent<HTMLSpanElement>) {
  const native = event.nativeEvent;
  return (
    (native instanceof InputEvent || native instanceof KeyboardEvent) &&
    native.isComposing
  );
}

/**
 * Truncates the text content of an element to the given number of code points
 * while keeping the caret at its current position where possible.
 */
function truncateContent(element: HTMLElement, maxLength: number): string {
  const selection = window.getSelection();
  const range = selection?.rangeCount ? selection.getRangeAt(0) : undefined;
  let offset = Number.MAX_SAFE_INTEGER;

  if (range && element.contains(range.startContainer)) {
    const before = range.cloneRange();
    before.selectNodeContents(element);
    before.setEnd(range.startContainer, range.startOffset);
    offset = before.toString().length;
  }

  const text = TextHelper.truncate(element.textContent || "", maxLength);
  element.textContent = text;

  const textNode = element.firstChild;
  if (textNode && selection) {
    const caret = document.createRange();
    caret.setStart(textNode, Math.min(offset, text.length));
    caret.collapse(true);
    selection.removeAllRanges();
    selection.addRange(caret);
  }

  return text;
}

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

  /* Browsers can leave line breaks behind after all text is deleted. */
  &[data-empty="true"] {
    display: inline-block;
  }

  &[data-empty="true"]::before {
    display: inline-block;
    float: inline-start;
    color: ${s("placeholder")};
    -webkit-text-fill-color: ${s("placeholder")};
    content: attr(data-placeholder);
    pointer-events: none;
    height: 0;
  }
`;

export default ContentEditable;
