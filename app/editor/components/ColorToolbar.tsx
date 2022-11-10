import { EditorView } from "prosemirror-view";
import * as React from "react";
import { Dictionary } from "~/hooks/useDictionary";
import ColorEditor from "./ColorEditor";
import FloatingToolbar from "./FloatingToolbar";

type Props = {
  isActive: boolean;
  view: EditorView;
  dictionary: Dictionary;
  onClose: () => void;
};

function isActive(props: Props) {
  const { view } = props;
  const { selection } = view.state;

  try {
    const paragraph = view.domAtPos(selection.from);
    return props.isActive && !!paragraph.node;
  } catch (err) {
    return false;
  }
}

export default class ColorToolbar extends React.Component<Props> {
  menuRef = React.createRef<HTMLDivElement>();

  state = {
    left: -1000,
    top: undefined,
  };

  componentDidMount() {
    window.addEventListener("mousedown", this.handleClickOutside);
  }

  componentWillUnmount() {
    window.removeEventListener("mousedown", this.handleClickOutside);
  }

  handleClickOutside = (event: Event) => {
    if (
      event.target instanceof HTMLElement &&
      this.menuRef.current &&
      this.menuRef.current.contains(event.target)
    ) {
      return;
    }

    this.props.onClose();
  };

  handleOnSelectColor = ({
    color,
    from,
    to,
  }: {
    color: string;
    from: number;
    to: number;
  }): void => {
    console.log("changing color", color, from, to);
    const { view } = this.props;
    const { state, dispatch } = view;

    const markType = state.schema.marks.color;

    dispatch(state.tr.addMark(from, to, markType.create({ color })));
  };

  render() {
    const { onClose, ...rest } = this.props;
    const { selection } = this.props.view.state;
    const active = isActive(this.props);

    return (
      <FloatingToolbar ref={this.menuRef} active={active} {...rest}>
        {active && (
          <ColorEditor
            key={`${selection.from}-${selection.to}`}
            from={selection.from}
            to={selection.to}
            onSelectColor={this.handleOnSelectColor}
            onClose={this.props.onClose}
            {...rest}
          />
        )}
      </FloatingToolbar>
    );
  }
}
