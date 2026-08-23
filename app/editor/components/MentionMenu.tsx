import { observer } from "mobx-react";
import { v4 as uuidv4 } from "uuid";
import { runInAction } from "mobx";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { MentionType } from "@shared/types";
import {
  dateToReadable,
  dateToRelativeReadable,
  parseISODate,
  toISODate,
  toISODateTime,
} from "@shared/utils/date";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { parseNaturalLanguageDate } from "@shared/utils/parseNaturalLanguageDate";
import { Avatar, AvatarSize, GroupAvatar } from "~/components/Avatar";
import { DynamicCalendarIcon } from "@shared/components/DynamicCalendarIcon";
import { DateSection } from "~/actions/sections";
import type { MentionMenuItem } from "~/editor/menus/mention";
import {
  collectionMentionItem,
  createDocumentMentionItems,
  documentMentionItem,
  groupMentionItem,
  userMentionItem,
} from "~/editor/menus/mention";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import useUserLocale from "~/hooks/useUserLocale";
import type Model from "~/models/base/Model";
import { client } from "~/utils/ApiClient";
import { useEditor } from "./EditorContext";
import type { Props as SuggestionsMenuProps } from "./SuggestionsMenu";
import SuggestionsMenu from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

type Props = Omit<
  SuggestionsMenuProps<MentionMenuItem>,
  "renderMenuItem" | "items" | "embeds"
>;

function MentionMenu({ search = "", isActive, ...rest }: Props) {
  const [loaded, setLoaded] = useState(false);
  // How familiar each suggested model is to the current user, keyed by model
  // id. The score does not depend on the search term, so scores from earlier
  // queries stay valid and are kept.
  const [familiarity, setFamiliarity] = useState<ReadonlyMap<string, number>>(
    new Map()
  );
  const { t } = useTranslation();
  const { auth, documents, users, collections, groups } = useStores();
  const { props: editorProps } = useEditor();
  const actorId = auth.currentUserId;
  const location = useLocation();
  const documentId = parseDocumentSlug(location.pathname);
  const userLocale = useUserLocale();
  const maxResultsInSection = search ? 25 : 5;

  // Surface a date suggestion when the search query parses as a natural
  // language date (e.g. "tomorrow", "next friday", "jan 2", "1pm"). Parsing is
  // asynchronous as chrono-node is loaded lazily, so the result is held in
  // state and applied once resolved.
  const [parsedISODate, setParsedISODate] = useState<string | undefined>();

  useEffect(() => {
    if (!search) {
      setParsedISODate(undefined);
      return;
    }
    let cancelled = false;
    void parseNaturalLanguageDate(search)
      .then((parsed) => {
        if (!cancelled) {
          setParsedISODate(
            parsed
              ? parsed.hasTime
                ? toISODateTime(parsed.date)
                : toISODate(parsed.date)
              : undefined
          );
        }
      })
      .catch(() => {
        // Parsing failed (e.g. the chrono chunk failed to load); drop the
        // suggestion rather than leaving a stale one.
        if (!cancelled) {
          setParsedISODate(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  let dateItems: MentionMenuItem[] = [];

  if (actorId && parsedISODate) {
    const title = dateToRelativeReadable(parsedISODate, t, userLocale);
    const subtitle = dateToReadable(parsedISODate, userLocale);

    dateItems = [
      {
        name: "mention",
        icon: (
          <DynamicCalendarIcon day={parseISODate(parsedISODate)?.getDate()} />
        ),
        title,
        subtitle: title !== subtitle ? subtitle : undefined,
        section: DateSection,
        appendSpace: true,
        attrs: {
          id: uuidv4(),
          type: MentionType.Date,
          modelId: parsedISODate,
          label: parsedISODate,
          actorId,
        },
      } as MentionMenuItem,
    ];
  }

  const { loading, request } = useRequest(
    useCallback(async () => {
      const res = await client.post("/suggestions.mention", {
        query: search,
        limit: maxResultsInSection,
      });

      runInAction(() => {
        res.data.documents.map(documents.add);
        res.data.users.map(users.add);
        res.data.collections.map(collections.add);
        res.data.groups.map(groups.add);
      });

      setFamiliarity(
        (previous) =>
          new Map([
            ...previous,
            ...Object.entries<number>(res.data.familiarity ?? {}),
          ])
      );
    }, [search, documents, users, collections, groups, maxResultsInSection])
  );

  // Suggestions that the current user is familiar with, for example a member of
  // one of their groups, are ranked above equally relevant ones.
  const weight = useCallback(
    (model: Model) => familiarity.get(model.id) ?? 1,
    [familiarity]
  );

  useEffect(() => {
    if (isActive) {
      void request();
    }
  }, [request, isActive]);

  useEffect(() => {
    if (actorId && !loading) {
      setLoaded(true);
    }
  }, [actorId, loading]);

  // Computed in the render body so MobX observer can track store access
  // (e.g. searchSuppressed). Previously this lived inside a useEffect which
  // runs outside the reactive context and triggered MobX warnings.
  const mentionItems: MentionMenuItem[] = actorId
    ? users
        .findByQuery(search, { maxResults: maxResultsInSection, weight })
        .map((user) => userMentionItem(t, user, actorId))
        .concat(
          groups
            .findByQuery(search, { maxResults: maxResultsInSection, weight })
            .map((group) => groupMentionItem(t, group, actorId))
        )
        .concat(
          documents
            .findByQuery(search, { maxResults: maxResultsInSection, weight })
            .map((doc) => documentMentionItem(doc, actorId))
        )
        .concat(
          collections
            .findByQuery(search, { maxResults: maxResultsInSection, weight })
            .map((collection) => collectionMentionItem(collection, actorId))
        )
        .concat(
          createDocumentMentionItems(t, {
            search,
            actorId,
            documentId,
            canCreate: !!editorProps.onCreateLink,
          })
        )
    : [];

  const items: MentionMenuItem[] = [...dateItems, ...mentionItems];

  const handleSelect = useCallback(
    async (item: MentionMenuItem) => {
      if (
        item.attrs.type === MentionType.Date ||
        item.attrs.type === MentionType.Document ||
        item.attrs.type === MentionType.Collection
      ) {
        return;
      }
      if (!documentId) {
        return;
      }
      if (item.attrs.type === MentionType.User) {
        // Check if the mentioned user has access to the document
        const res = await client.post("/documents.users", {
          id: documentId,
          userId: item.attrs.modelId,
        });
        if (!res.data.length) {
          const user = users.get(item.attrs.modelId);
          toast.message(
            t(
              "{{ userName }} won't be notified, as they do not have access to this document",
              {
                userName: item.attrs.label,
              }
            ),
            {
              icon: <Avatar model={user} size={AvatarSize.Toast} />,
              duration: 10000,
            }
          );
        }
      } else if (item.attrs.type === MentionType.Group) {
        const group = groups.get(item.attrs.modelId);
        toast.message(
          t(
            `Members of "{{ groupName }}" that have access to this document will be notified`,
            {
              groupName: item.attrs.label,
            }
          ),
          {
            icon: group ? <GroupAvatar group={group} /> : undefined,
            duration: 10000,
          }
        );
      }
    },
    [t, users, documentId, groups]
  );

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
      onSelect={handleSelect}
      renderMenuItem={renderMenuItem}
      items={items}
    />
  );
}

export default observer(MentionMenu);
