import { observer } from "mobx-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import useStores from "~/hooks/useStores";
import type { MentionMenuItem } from "~/editor/menus/mention";
import {
  createDocumentMentionItems,
  documentMentionItem,
} from "~/editor/menus/mention";
import { useEditor } from "./EditorContext";
import type { Props as SuggestionsMenuProps } from "./SuggestionsMenu";
import SuggestionsMenu from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

type Props = Omit<
  SuggestionsMenuProps<MentionMenuItem>,
  "renderMenuItem" | "items" | "embeds"
>;

/** Number of documents shown while searching. */
const MaxResults = 25;

/** Number of documents shown before a search term is entered. */
const MaxDefaultResults = 5;

function DocumentMenu({ search = "", isActive, ...rest }: Props) {
  const [loaded, setLoaded] = useState(false);
  const { t } = useTranslation();
  const { auth, documents } = useStores();
  const { props: editorProps } = useEditor();
  const actorId = auth.currentUserId;
  const location = useLocation();
  const documentId = parseDocumentSlug(location.pathname);

  // Spaces are allowed in the search term, so it may have trailing whitespace.
  const query = search.trim();

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        // A title search requires a query, so the most recently viewed
        // documents are offered until the user starts typing.
        await (query
          ? documents.searchTitles({
              query,
              limit: MaxResults,
              filters: [
                { field: "archivedAt", operator: "isNull" },
                { field: "publishedAt", operator: "isNotNull" },
              ],
            })
          : documents.fetchRecentlyViewed({ limit: MaxDefaultResults }));
      } catch {
        // Fall back to whatever the store already holds rather than blocking
        // the menu from opening.
      }

      if (!cancelled) {
        setLoaded(true);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [documents, query, isActive]);

  // Computed in the render body, from the store rather than the request, so
  // MobX observer keeps the results up to date.
  const results = query
    ? documents.findByQuery(query, { maxResults: MaxResults })
    : documents.recentlyViewed.slice(0, MaxDefaultResults);

  const items: MentionMenuItem[] = actorId
    ? [
        ...results.map((document) => documentMentionItem(document, actorId)),
        ...createDocumentMentionItems(t, {
          search,
          actorId,
          documentId,
          canCreate: !!editorProps.onCreateLink,
        }),
      ]
    : [];

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
      renderMenuItem={renderMenuItem}
      items={items}
    />
  );
}

export default observer(DocumentMenu);
