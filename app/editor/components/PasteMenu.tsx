import { LinkIcon } from "outline-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { EmbedDescriptor } from "@shared/editor/embeds";
import SuggestionsMenu, {
  Props as SuggestionsMenuProps,
} from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

type Props = Omit<
  SuggestionsMenuProps,
  "renderMenuItem" | "items" | "embeds" | "trigger"
> & {
  pastedText: string;
  embeds: EmbedDescriptor[];
};

const PasteMenu = ({ embeds, ...props }: Props) => {
  const { t } = useTranslation();

  const embed = React.useMemo(() => {
    for (const e of embeds) {
      const matches = e.matcher(props.pastedText);
      if (matches) {
        return e;
      }
    }
    return;
  }, [embeds, props.pastedText]);

  const items = React.useMemo(
    () => [
      {
        name: "noop",
        title: t("Keep as link"),
        icon: <LinkIcon />,
      },
      {
        name: "embed",
        title: t("Embed"),
        icon: embed?.icon,
        keywords: embed?.keywords,
      },
    ],
    [embed, t]
  );

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
          icon={item.icon}
        />
      )}
      items={items}
    />
  );
};

export default PasteMenu;
