import React from "react";
import { useTranslation } from "react-i18next";
import SuggestionsMenu, {
  Props as SuggestionsMenuProps,
} from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

type Props = Omit<SuggestionsMenuProps, "renderMenuItem" | "items" | "embeds">;

const PasteMenu = (props: Props) => {
  const { t } = useTranslation();

  const items = React.useMemo(
    () => [
      {
        name: "link",
        title: t("URL"),
      },
      {
        name: "embed",
        title: t("Embed"),
      },
    ],
    [t]
  );

  return (
    <SuggestionsMenu
      {...props}
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
