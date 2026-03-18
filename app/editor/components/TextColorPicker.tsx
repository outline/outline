import { useCallback } from "react";
import ColorPicker from "@shared/components/ColorPicker";
import { useEditor } from "./EditorContext";

type Props = {
  /** The currently active color */
  activeColor: string;
};

/**
 * A color picker component for applying text (foreground) color.
 */
function TextColorPicker({ activeColor }: Props) {
  const { commands } = useEditor();

  const handleSelect = useCallback(
    (color: string) => {
      if (commands.textColor) {
        commands.textColor({ color });
      }
    },
    [commands]
  );

  return (
    <ColorPicker alpha={false} activeColor={activeColor} onSelect={handleSelect} />
  );
}

export default TextColorPicker;
