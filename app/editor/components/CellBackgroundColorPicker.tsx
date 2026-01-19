import { useCallback } from "react";
import ColorPicker from "./ColorPicker";
import { useEditor } from "./EditorContext";

type Props = {
  /** The currently active color */
  activeColor: string;
};

function CellBackgroundColorPicker({ activeColor }: Props) {
  const { commands } = useEditor();

  const handleSelect = useCallback(
    (color: string) => {
      if (commands.toggleCellBackground) {
        commands.toggleCellBackground({ color });
      }
    },
    [commands]
  );

  return <ColorPicker activeColor={activeColor} onSelect={handleSelect} />;
}

export default CellBackgroundColorPicker;
