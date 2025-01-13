import React from "react";
import SuggestionsMenu, {
  Props as SuggestionsMenuProps,
} from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

type Props = Omit<
  SuggestionsMenuProps,
  "renderMenuItem" | "items" | "embeds" | "trigger"
>;

const PasteMenu = (props: Props) => {
  const items = [
    {
      name: "link",
      title: "URL",
    },
    {
      name: "embed",
      title: "Embed",
    },
  ];

  return (
    <SuggestionsMenu
      {...props}
      trigger=""
      filterable={false}
      renderMenuItem={(item, _index, options) => (
        <SuggestionsMenuItem
          onClick={() => {
            props.onSelect?.(item);
          }}
          selected={options.selected}
          title={item.title}
        />
      )}
      items={items}
    />
  );
};

export default PasteMenu;
