import { useCallback } from "react";
import ColorPicker from "@shared/components/ColorPicker";
import { useEditor } from "./EditorContext";

type Props = {
  /** The currently active color */
  activeColor: string;
};

function HighlightColorPicker({ activeColor }: Props) {
  const { commands } = useEditor();

  const handleSelect = useCallback(
    (color: string) => {
      if (commands.highlight) {
        commands.highlight({ color });
      }
    },
    [commands]
  );

  return (
    <ColorPicker alpha activeColor={activeColor} onSelect={handleSelect} />
  );
}

export default HighlightColorPicker;
