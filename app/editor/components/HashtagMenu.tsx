import { isEmail } from "class-validator";
import { observer } from "mobx-react";
import { HashtagIcon } from "outline-icons";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { MenuItem } from "@shared/editor/types";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import useRequest from "~/hooks/useRequest";
import { client } from "~/utils/ApiClient";
import type { Props as SuggestionsMenuProps } from "./SuggestionsMenu";
import SuggestionsMenu from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

interface HashtagItem extends MenuItem {
  attrs: {
    tag: string;
  };
}

type Props = Omit<
  SuggestionsMenuProps<HashtagItem>,
  "renderMenuItem" | "items" | "embeds"
>;

function HashtagMenu({ search, isActive, ...rest }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [items, setItems] = useState<HashtagItem[]>([]);
  const { t } = useTranslation();
  const rawSearch = useMemo(() => {
    if (!search) {
      return "";
    }
    return search.replace(/^#+/, "").trim();
  }, [search]);

  const normalizedSearch = useMemo(() => {
    if (!rawSearch) {
      return undefined;
    }
    return rawSearch.toLowerCase();
  }, [rawSearch]);

  const { loading, request } = useRequest(
    useCallback(async () => {
      const res = await client.post("/suggestions.hashtag", {
        query: normalizedSearch,
        limit: 25,
      });

      const hashtagList = (res.data.hashtags || []).filter(
        (tag: unknown): tag is string => typeof tag === "string"
      );
      const normalizedExisting = hashtagList.map((tag) => tag.toLowerCase());

      const nextItems: HashtagItem[] = hashtagList.map((tag: string) => ({
        name: "hashtag",
        title: `#${tag}`,
        icon: <HashtagIcon />,
        attrs: {
          tag: tag.toLowerCase(),
        },
      }));

      // Если есть поисковый запрос и он не найден в списке, предлагаем создать новый хештег
      if (
        normalizedSearch &&
        rawSearch &&
        !normalizedExisting.includes(normalizedSearch)
      ) {
        nextItems.unshift({
          name: "hashtag",
          title: `#${rawSearch}`,
          icon: <HashtagIcon />,
          subtitle: t("Create new hashtag"),
          priority: 1000,
          attrs: {
            tag: normalizedSearch,
          },
        });
      }

      setItems(nextItems);
      setLoaded(true);
    }, [normalizedSearch, rawSearch, t])
  );

  useEffect(() => {
    if (isActive) {
      void request();
    }
  }, [request, isActive]);

  const renderMenuItem = useCallback(
    (item, _index, options) => (
      <SuggestionsMenuItem
        {...options}
        subtitle={item.subtitle}
        title={item.title}
        icon={item.icon}
      />
    ),
    []
  );

  // Prevent showing the menu until we have data otherwise it will be positioned
  // incorrectly due to the height being unknown.
  if (!loaded) {
    return null;
  }

  return (
    <SuggestionsMenu
      {...rest}
      isActive={isActive}
      filterable={false}
      search={search}
      enterBehavior="close"
      hint={t("Enter closes suggestions. Press Ctrl+Enter to insert the first tag.")}
      renderMenuItem={renderMenuItem}
      items={items}
    />
  );
}

export default observer(HashtagMenu);
