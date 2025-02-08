import { ArrowIcon, CloseIcon, OpenIcon } from "outline-icons";
import { Mark } from "prosemirror-model";
import { Selection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import { toast } from "sonner";
import styled from "styled-components";
import { isInternalUrl, sanitizeUrl } from "@shared/utils/urls";
import Flex from "~/components/Flex";
import { Dictionary } from "~/hooks/useDictionary";
import Logger from "~/utils/Logger";
import Input from "./Input";
import ToolbarButton from "./ToolbarButton";
import Tooltip from "./Tooltip";

type Props = {
  mark?: Mark;
  from: number;
  to: number;
  dictionary: Dictionary;
  onRemoveLink?: () => void;
  onSelectLink: (options: {
    href: string;
    title?: string;
    from: number;
    to: number;
  }) => void;
  onClickLink: (
    href: string,
    event: React.MouseEvent<HTMLButtonElement>
  ) => void;
  view: EditorView;
};

type State = {
  value: string;
  previousValue: string;
};

class LinkEditor extends React.Component<Props, State> {
  discardInputValue = false;
  initialValue = this.href;
  initialSelectionLength = this.props.to - this.props.from;
  inputRef = React.createRef<HTMLInputElement>();

  state: State = {
    value: this.href,
    previousValue: "",
  };

  get href(): string {
    return sanitizeUrl(this.props.mark?.attrs.href) ?? "";
  }

  componentDidMount(): void {
    window.addEventListener("keydown", this.handleGlobalKeyDown);
  }

  componentWillUnmount = () => {
    window.removeEventListener("keydown", this.handleGlobalKeyDown);

    // If we discarded the changes then nothing to do
    if (this.discardInputValue) {
      return;
    }

    // If the link is the same as it was when the editor opened, nothing to do
    if (this.state.value === this.initialValue) {
      return;
    }

    // If the link is totally empty or only spaces then remove the mark
    const href = (this.state.value || "").trim();
    if (!href) {
      return this.handleRemoveLink();
    }

    this.save(href, href);
  };

  handleGlobalKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "k" && event.metaKey) {
      this.inputRef.current?.select();
    }
  };

  save = (href: string, title?: string): void => {
    href = href.trim();

    if (href.length === 0) {
      return;
    }

    this.discardInputValue = true;
    const { from, to } = this.props;
    href = sanitizeUrl(href) ?? "";

    this.props.onSelectLink({ href, title, from, to });
  };

  handleKeyDown = (event: React.KeyboardEvent): void => {
    switch (event.key) {
      case "Enter": {
        event.preventDefault();
        const { value } = this.state;

        this.save(value, value);

        if (this.initialSelectionLength) {
          this.moveSelectionToEnd();
        }

        return;
      }

      case "Escape": {
        event.preventDefault();

        if (this.initialValue) {
          this.setState({ value: this.initialValue }, this.moveSelectionToEnd);
        } else {
          this.handleRemoveLink();
        }
        return;
      }
    }
  };

  handleSearch = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const value = event.target.value;

    this.setState({
      value,
    });

    const trimmedValue = value.trim();

    if (trimmedValue) {
      try {
        this.setState({
          previousValue: trimmedValue,
        });
      } catch (err) {
        Logger.error("Error searching for link", err);
      }
    }
  };

  handlePaste = (): void => {
    setTimeout(() => this.save(this.state.value, this.state.value), 0);
  };

  handleOpenLink = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();

    try {
      this.props.onClickLink(this.href, event);
    } catch (err) {
      toast.error(this.props.dictionary.openLinkError);
    }
  };

  handleRemoveLink = (): void => {
    this.discardInputValue = true;

    const { from, to, mark, view, onRemoveLink } = this.props;
    const { state, dispatch } = this.props.view;

    if (mark) {
      dispatch(state.tr.removeMark(from, to, mark));
    }

    onRemoveLink?.();
    view.focus();
  };

  moveSelectionToEnd = () => {
    const { to, view } = this.props;
    const { state, dispatch } = view;
    const nextSelection = Selection.findFrom(state.tr.doc.resolve(to), 1, true);
    if (nextSelection) {
      dispatch(state.tr.setSelection(nextSelection));
    }
    view.focus();
  };

  render() {
    const { view, dictionary } = this.props;
    const { value } = this.state;
    const isInternal = isInternalUrl(value);

    return (
      <Wrapper>
        <Input
          ref={this.inputRef}
          value={value}
          placeholder={dictionary.enterLink}
          onKeyDown={this.handleKeyDown}
          onPaste={this.handlePaste}
          onChange={this.handleSearch}
          onFocus={this.handleSearch}
          autoFocus={this.href === ""}
          readOnly={!view.editable}
        />

        <Tooltip
          content={isInternal ? dictionary.goToLink : dictionary.openLink}
        >
          <ToolbarButton onClick={this.handleOpenLink} disabled={!value}>
            {isInternal ? <ArrowIcon /> : <OpenIcon />}
          </ToolbarButton>
        </Tooltip>
        {view.editable && (
          <Tooltip content={dictionary.removeLink}>
            <ToolbarButton onClick={this.handleRemoveLink}>
              <CloseIcon />
            </ToolbarButton>
          </Tooltip>
        )}
      </Wrapper>
    );
  }
}

const Wrapper = styled(Flex)`
  pointer-events: all;
  gap: 8px;
`;

export default LinkEditor;
