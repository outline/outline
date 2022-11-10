import { Mark } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import * as React from "react";
import styled from "styled-components";
import Flex from "~/components/Flex";
import { Dictionary } from "~/hooks/useDictionary";
import Colors from "../utils/colors.json";
import ColorItem from "./ColorItem";

export type SearchResult = {
  title: string;
  subtitle?: string;
  url: string;
};

type Props = {
  mark?: Mark;
  from: number;
  to: number;
  dictionary: Dictionary;
  onSelectColor: (options: { color: string; from: number; to: number }) => void;
  onClose?: any;
  view: EditorView;
};

type State = {
  results: {
    [keyword: string]: SearchResult[];
  };
  value: string;
  previousValue: string;
  selectedIndex: number;
};

class ColorEditor extends React.Component<Props, State> {
  discardInputValue = false;
  initialValue = this.color;
  initialSelectionLength = this.props.to - this.props.from;

  state: State = {
    selectedIndex: -1,
    value: this.color,
    previousValue: "",
    results: {},
  };

  get color(): string {
    return this.props.mark?.attrs.color;
  }

  componentWillUnmount = () => {
    if (this.discardInputValue) {
      return;
    }

    if (this.state.value === this.initialValue) {
      return;
    }

    const color = (this.state.value || "").trim();
    this.save(color);
  };

  save = (color: string): void => {
    const { from, to } = this.props;
    this.props.onSelectColor({ color, from, to });
  };

  handleSelectColor = (
    event: React.MouseEvent,
    color: string,
    index: number
  ) => {
    event.preventDefault();
    const { from, to } = this.props;
    this.props.onSelectColor({ color, from, to });
    this.setState({ selectedIndex: index });
  };

  render() {
    return (
      <Wrapper>
        <Items>
          {Colors?.colors?.map((color, index: number) => {
            return (
              <ColorItem
                color={color.color}
                colorCode={color.code.hex}
                selected={color.code.hex === this.state.value}
                onClick={(e: React.MouseEvent) => {
                  this.handleSelectColor(e, color.code.hex, index);
                  this.props.onClose();
                }}
              />
            );
          })}
        </Items>
      </Wrapper>
    );
  }
}

const Wrapper = styled(Flex)`
  margin-left: -8px;
  margin-right: -8px;
  min-width: 336px;
  pointer-events: all;
  gap: 8px;
`;

const Items = styled.ol`
  background: ${(props) => props.theme.toolbarBackground};
  position: absolute;
  top: 100%;
  width: 100%;
  height: auto;
  left: 0;
  padding: 0;
  margin: 0;
  margin-top: -3px;
  margin-bottom: 0;
  border-radius: 0 0 4px 4px;
  overflow-y: auto;
  overscroll-behavior: none;
  max-height: 260px;

  @media (hover: none) and (pointer: coarse) {
    position: fixed;
    top: auto;
    bottom: 40px;
    border-radius: 0;
    max-height: 50vh;
    padding: 8px 8px 4px;
  }
`;

export default ColorEditor;
