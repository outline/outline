import { observer } from "mobx-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { StatusFilter } from "@shared/types";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import useStores from "~/hooks/useStores";
import type { MentionMenuItem } from "~/editor/menus/mention";
import {
  createDocumentMentionItems,
  documentMentionItem,
} from "~/editor/menus/mention";
import type Document from "~/models/Document";
import type { Props as SuggestionsMenuProps } from "./SuggestionsMenu";
import SuggestionsMenu from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

type Props = Omit<
  SuggestionsMenuProps<MentionMenuItem>,
  "renderMenuItem" | "items" | "embeds"
>;

/** Number of documents shown while searching, and before a search is entered. */
const MaxResults = 25;
const MaxDefaultResults = 5;

function DocumentMenu({ search = "", isActive, ...rest }: Props) {
  const { t } = useTranslation();
  const { auth, documents } = useStores();
  const actorId = auth.currentUserId;
  const location = useLocation();
  const documentId = parseDocumentSlug(location.pathname);
  const [results, setResults] = useState<Document[]>();

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        // A title search requires a query, so the most recently viewed
        // documents are offered until the user starts typing.
        const found = search
          ? (
              await documents.searchTitles({
                query: search,
                limit: MaxResults,
                statusFilter: [StatusFilter.Published],
              })
            ).map((result) => result.document)
          : await documents.fetchRecentlyViewed({ limit: MaxDefaultResults });

        if (!cancelled) {
          setResults(found);
        }
      } catch {
        // Keep whichever results are on screen rather than emptying the menu,
        // while still allowing it to open on the first failed request.
        if (!cancelled) {
          setResults((previous) => previous ?? []);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [documents, search, isActive]);

  const items: MentionMenuItem[] =
    actorId && results
      ? [
          ...results.map((document) => documentMentionItem(document, actorId)),
          ...createDocumentMentionItems(t, { search, actorId, documentId }),
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
  if (!results) {
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
