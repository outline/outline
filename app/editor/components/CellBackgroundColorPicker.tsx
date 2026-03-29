import { useCallback } from "react";
import ColorPicker from "@shared/components/ColorPicker";
import { useEditor } from "./EditorContext";

type Props = {
  /** The currently active color */
  activeColor: string;
  command: string;
};

function CellBackgroundColorPicker({ activeColor, command }: Props) {
  const { commands } = useEditor();

  const handleSelect = useCallback(
    (color: string) => {
      if (commands[command]) {
        commands[command]({ color });
      }
    },
    [commands, command]
  );

  return (
    <ColorPicker alpha activeColor={activeColor} onSelect={handleSelect} />
  );
}

export default CellBackgroundColorPicker;
