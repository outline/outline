import { observer } from "mobx-react";
import { Slice } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import { __parseFromClipboard } from "prosemirror-view";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Icon, { IconTitleWrapper } from "@shared/components/Icon";
import isMarkdown from "@shared/editor/lib/isMarkdown";
import normalizePastedMarkdown from "@shared/editor/lib/markdown/normalize";
import { extraArea, s } from "@shared/styles";
import { light } from "@shared/styles/theme";
import {
  getCurrentDateAsString,
  getCurrentDateTimeAsString,
  getCurrentTimeAsString,
} from "@shared/utils/date";
import { isModKey } from "@shared/utils/keyboard";
import { DocumentValidation } from "@shared/validations";
import ContentEditable, { RefHandle } from "~/components/ContentEditable";
import { useDocumentContext } from "~/components/DocumentContext";
import { PopoverButton } from "~/components/IconPicker/components/PopoverButton";
import useBoolean from "~/hooks/useBoolean";
import usePolicy from "~/hooks/usePolicy";

const IconPicker = React.lazy(() => import("~/components/IconPicker"));

type Props = {
  /** ID of the associated document */
  documentId: string;
  /** Title to display */
  title: string;
  /** Icon to display */
  icon?: string | null;
  /** Icon color */
  color: string;
  /** Placeholder to display when the document has no title */
  placeholder?: string;
  /** Should the title be editable, policies will also be considered separately */
  readOnly?: boolean;
  /** Callback called on any edits to text */
  onChangeTitle?: (text: string) => void;
  /** Callback called when the user selects an icon */
  onChangeIcon?: (icon: string | null, color: string | null) => void;
  /** Callback called when the user expects to move to the "next" input */
  onGoToNextInput?: (insertParagraph?: boolean) => void;
  /** Callback called when the user expects to save (CMD+S) */
  onSave?: (options: { publish?: boolean; done?: boolean }) => void;
  /** Callback called when focus leaves the input */
  onBlur?: React.FocusEventHandler<HTMLSpanElement>;
};

const lineHeight = "1.25";
const fontSize = "2.25em";

const DocumentTitle = React.forwardRef(function _DocumentTitle(
  {
    documentId,
    title,
    icon,
    color,
    readOnly,
    onChangeTitle,
    onChangeIcon,
    onSave,
    onGoToNextInput,
    onBlur,
    placeholder,
  }: Props,
  externalRef: React.RefObject<RefHandle>
) {
  const ref = React.useRef<RefHandle>(null);
  const [iconPickerIsOpen, handleOpen, setIconPickerClosed] = useBoolean();
  const { editor } = useDocumentContext();
  const can = usePolicy(documentId);

  const handleClick = React.useCallback(() => {
    ref.current?.focus();
  }, [ref]);

  const restoreFocus = React.useCallback(() => {
    ref.current?.focusAtEnd();
  }, [ref]);

  const handleBlur = React.useCallback(
    (ev: React.FocusEvent<HTMLSpanElement>) => {
      // Do nothing and simply return if the related target is the parent
      // or a sibling of the current target element(the <span>
      // containing document title)
      if (
        ev.currentTarget.parentElement === ev.relatedTarget ||
        (ev.relatedTarget &&
          ev.currentTarget.parentElement === ev.relatedTarget.parentElement)
      ) {
        return;
      }
      if (onBlur) {
        onBlur(ev);
      }
    },
    [onBlur]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();

        if (isModKey(event)) {
          onSave?.({
            done: true,
          });
          return;
        }

        onGoToNextInput?.(true);
        return;
      }

      if (event.key === "Tab" || event.key === "ArrowDown") {
        event.preventDefault();
        onGoToNextInput?.();
        return;
      }

      if (event.key === "s" && isModKey(event)) {
        event.preventDefault();
        onSave?.({});
        return;
      }
    },
    [onGoToNextInput, onSave]
  );

  const handleChange = React.useCallback(
    (input: string) => {
      let value = input;

      if (/\/date\s$/.test(input)) {
        value = getCurrentDateAsString();
        ref?.current?.focusAtEnd();
      } else if (/\/time$/.test(input)) {
        value = getCurrentTimeAsString();
        ref?.current?.focusAtEnd();
      } else if (/\/datetime$/.test(input)) {
        value = getCurrentDateTimeAsString();
        ref?.current?.focusAtEnd();
      }

      onChangeTitle?.(value);
    },
    [ref, onChangeTitle]
  );

  // Custom paste handling so that if a multiple lines are pasted we
  // only take the first line and insert the rest directly into the editor.
  const handlePaste = React.useCallback(
    (event: React.ClipboardEvent) => {
      event.preventDefault();

      const text = event.clipboardData.getData("text/plain");
      const html = event.clipboardData.getData("text/html");
      const [firstLine, ...rest] = text.split(`\n`);
      const content = rest.join(`\n`).trim();

      window.document.execCommand(
        "insertText",
        false,
        firstLine.replace(/^#+\s?/, "")
      );

      if (editor && content) {
        const { view, pasteParser } = editor;
        let slice;

        if (isMarkdown(text)) {
          const paste = pasteParser.parse(normalizePastedMarkdown(content));
          if (paste) {
            slice = paste.slice(0);
          }
        } else {
          const defaultSlice = __parseFromClipboard(
            view,
            text,
            html,
            false,
            view.state.selection.$from
          );

          // remove first node from slice
          slice = defaultSlice.content.firstChild
            ? new Slice(
                defaultSlice.content.cut(
                  defaultSlice.content.firstChild.nodeSize
                ),
                defaultSlice.openStart,
                defaultSlice.openEnd
              )
            : defaultSlice;
        }

        if (slice) {
          view.dispatch(
            view.state.tr
              .setSelection(Selection.atStart(view.state.doc))
              .replaceSelection(slice)
          );
        }
      }
    },
    [editor]
  );

  const handleClose = React.useCallback(() => {
    setIconPickerClosed();
    restoreFocus();
  }, [setIconPickerClosed, restoreFocus]);

  const handleIconChange = React.useCallback(
    (chosenIcon: string | null, iconColor: string | null) => {
      if (icon !== chosenIcon || color !== iconColor) {
        onChangeIcon?.(chosenIcon, iconColor);
      }
    },
    [icon, color, onChangeIcon]
  );

  const dir = ref.current?.getComputedDirection();

  const fallbackIcon = icon ? (
    <Icon value={icon} color={color} size={40} />
  ) : null;

  return (
    <Title
      onClick={handleClick}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      onBlur={handleBlur}
      placeholder={placeholder}
      value={title}
      $iconPickerIsOpen={iconPickerIsOpen}
      $containsIcon={!!icon}
      autoFocus={!title}
      maxLength={DocumentValidation.maxTitleLength}
      readOnly={readOnly}
      dir="auto"
      ref={mergeRefs([ref, externalRef])}
    >
      {can.update && !readOnly ? (
        <IconTitleWrapper dir={dir}>
          <React.Suspense fallback={fallbackIcon}>
            <StyledIconPicker
              icon={icon ?? null}
              color={color}
              size={40}
              popoverPosition="bottom-start"
              onChange={handleIconChange}
              onOpen={handleOpen}
              onClose={handleClose}
              allowDelete
              borderOnHover
            />
          </React.Suspense>
        </IconTitleWrapper>
      ) : icon ? (
        <IconTitleWrapper dir={dir}>{fallbackIcon}</IconTitleWrapper>
      ) : null}
    </Title>
  );
});

type TitleProps = {
  $containsIcon: boolean;
  $iconPickerIsOpen: boolean;
  readOnly?: boolean;
};

// Extra area prevents gap between icon and beginning of title
const StyledIconPicker = styled(IconPicker)`
  ${extraArea(8)}
`;

const Title = styled(ContentEditable)<TitleProps>`
  position: relative;
  line-height: ${lineHeight};
  margin-top: 6vh;
  margin-bottom: 0.5em;
  margin-left: ${(props) =>
    props.$containsIcon || props.$iconPickerIsOpen ? "40px" : "0px"};
  font-size: ${fontSize};
  font-weight: 600;
  border: 0;
  padding: 0;
  cursor: ${(props) => (props.readOnly ? "default" : "text")};

  > span {
    outline: none;
  }

  &::placeholder {
    color: ${s("placeholder")};
    -webkit-text-fill-color: ${s("placeholder")};
    opacity: 1;
  }

  ${(props: TitleProps) =>
    !props.readOnly &&
    css`
      &:focus-within,
      &:focus {
        margin-left: 40px;

        ${PopoverButton} {
          opacity: 1 !important;
        }
      }
    `};

  ${PopoverButton} {
    opacity: ${(props: TitleProps) =>
      props.$containsIcon ? "1 !important" : 0};
  }

  ${breakpoint("tablet")`
    margin-left: 0;

    &:focus-within,
    &:focus {
      margin-left: 0;
    }

    &:hover {
      ${PopoverButton} {
        opacity: 0.5;

        &:hover {
          opacity: 1;
        }
      }
    }`};

  @media print {
    color: ${light.text};
    -webkit-text-fill-color: ${light.text};
    background: none;
  }
`;

export default observer(DocumentTitle);
