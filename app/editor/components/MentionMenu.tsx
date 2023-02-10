import * as React from "react";
import { MenuItem } from "@shared/editor/types";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import CommandMenu, { Props } from "./CommandMenu";
import MentionMenuItem from "./MentionMenuItem";

interface MentionItem extends MenuItem {
  name: string;
  title: string;
  attrs: {
    "data-type": string;
    "data-id": string;
    label: string;
  };
}

type MentionMenuProps = Omit<
  Props<MentionItem>,
  "renderMenuItem" | "items" | "onLinkToolbarOpen" | "embeds" | "onClearSearch"
>;

function MentionMenu({ search, ...rest }: MentionMenuProps) {
  const [items, setItems] = React.useState<MentionItem[]>([]);
  const { users } = useStores();
  const { data, request } = useRequest(
    React.useCallback(() => users.fetchPage({ query: search }), [users, search])
  );

  React.useEffect(() => {
    request();
  }, [request]);

  React.useEffect(() => {
    if (data) {
      setItems(
        data.map((d) => ({
          name: "mention",
          title: d.name,
          attrs: {
            "data-type": "user",
            "data-id": d.id,
            label: d.name,
          },
        }))
      );
    }
  }, [data]);

  const clearSearch = () => {
    const { state, dispatch } = rest.view;

    // clear search input
    dispatch(
      state.tr.insertText(
        "",
        state.selection.$from.pos - (search ?? "").length - 1,
        state.selection.to
      )
    );
  };

  const containerId = "mention-menu-container";
  return (
    <CommandMenu
      {...rest}
      id={containerId}
      filterable={false}
      onClearSearch={clearSearch}
      search={search}
      renderMenuItem={(item, _index, options) => (
        <MentionMenuItem
          onClick={options.onClick}
          selected={options.selected}
          title={item.title}
          label={item.attrs.label}
          containerId={containerId}
        />
      )}
      items={items}
    />
  );
}

export default MentionMenu;
