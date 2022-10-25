import data from "@emoji-mart/data";
import { init } from "emoji-mart";
import React from "react";

init({ data });

type Props = {
  id?: string;
  shortcodes?: string;
  native: string;
  size?: string;
  fallback?: string;
  set?: string;
  skin?: string;
};

const Emoji: React.FC<Props> = ({
  id,
  shortcodes,
  native,
  size,
  fallback,
  set,
  skin,
}: Props) => {
  return (
    <em-emoji
      id={id}
      shortcodes={shortcodes}
      native={native}
      size={size}
      fallback={fallback}
      set={set}
      skin={skin}
    />
  );
};

export default Emoji;
