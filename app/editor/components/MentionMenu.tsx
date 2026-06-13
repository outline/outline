import { isEmail } from "class-validator";
import { observer } from "mobx-react";
import { v4 as uuidv4 } from "uuid";
import { runInAction } from "mobx";
import {
  DocumentIcon,
  PlusIcon,
  NewDocumentIcon,
  CollectionIcon,
} from "outline-icons";
import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import Icon from "@shared/components/Icon";
import type { MenuItem } from "@shared/editor/types";
import { MentionType } from "@shared/types";
import {
  dateToReadable,
  dateToRelativeReadable,
  parseISODate,
  toISODate,
} from "@shared/utils/date";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { parseNaturalLanguageDate } from "@shared/utils/parseNaturalLanguageDate";
import { Avatar, AvatarSize, GroupAvatar } from "~/components/Avatar";
import DocumentBreadcrumb from "~/components/DocumentBreadcrumb";
import { DynamicCalendarIcon } from "@shared/components/DynamicCalendarIcon";
import Flex from "~/components/Flex";
import {
  DateSection,
  DocumentsSection,
  UserSection,
  CollectionsSection,
  GroupSection,
} from "~/actions/sections";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import useUserLocale from "~/hooks/useUserLocale";
import { client } from "~/utils/ApiClient";
import type { Props as SuggestionsMenuProps } from "./SuggestionsMenu";
import SuggestionsMenu from "./SuggestionsMenu";
import SuggestionsMenuItem from "./SuggestionsMenuItem";

interface MentionItem extends MenuItem {
  attrs: {
    id: string;
    type: MentionType;
    modelId: string;
    label: string;
    actorId?: string;
  };
}

type Props = Omit<
  SuggestionsMenuProps<MentionItem>,
  "renderMenuItem" | "items" | "embeds"
>;

function MentionMenu({ search = "", isActive, ...rest }: Props) {
  const [loaded, setLoaded] = useState(false);
  const { t } = useTranslation();
  const { auth, documents, users, collections, groups } = useStores();
  const actorId = auth.currentUserId;
  const location = useLocation();
  const documentId = parseDocumentSlug(location.pathname);
  const userLocale = useUserLocale();
  const maxResultsInSection = search ? 25 : 5;

  // Surface a date suggestion when the search query parses as a natural
  // language date (e.g. "tomorrow", "next friday", "jan 2"). Parsing is
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
      .then((date) => {
        if (!cancelled) {
          setParsedISODate(date ? toISODate(date) : undefined);
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

  let dateItems: MentionItem[] = [];

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
      } as MentionItem,
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
    }, [search, documents, users, collections, groups, maxResultsInSection])
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
  const mentionItems: MentionItem[] = actorId
    ? users
        .findByQuery(search, { maxResults: maxResultsInSection })
        .map(
          (user) =>
            ({
              name: "mention",
              icon: (
                <Flex
                  align="center"
                  justify="center"
                  style={{ width: 24, height: 24 }}
                >
                  <Avatar
                    model={user}
                    alt={t("Profile picture")}
                    size={AvatarSize.Small}
                  />
                </Flex>
              ),
              title: user.name,
              section: UserSection,
              appendSpace: true,
              attrs: {
                id: uuidv4(),
                type: MentionType.User,
                modelId: user.id,
                actorId,
                label: user.name,
              },
            }) as MentionItem
        )
        .concat(
          groups
            .findByQuery(search, { maxResults: maxResultsInSection })
            .map((group) => ({
              name: "mention",
              icon: (
                <Flex
                  align="center"
                  justify="center"
                  style={{ width: 24, height: 24, marginRight: 4 }}
                >
                  <GroupAvatar group={group} size={AvatarSize.Small} />
                </Flex>
              ),
              title: group.name,
              subtitle: t("{{ count }} members", {
                count: group.memberCount,
              }),
              section: GroupSection,
              appendSpace: true,
              attrs: {
                id: uuidv4(),
                type: MentionType.Group,
                modelId: group.id,
                actorId,
                label: group.name,
              },
            }))
        )
        .concat(
          documents
            .findByQuery(search, { maxResults: maxResultsInSection })
            .map(
              (doc) =>
                ({
                  name: "mention",
                  icon: doc.icon ? (
                    <Icon
                      value={doc.icon}
                      initial={doc.initial}
                      color={doc.color ?? undefined}
                    />
                  ) : (
                    <DocumentIcon />
                  ),
                  title: doc.title,
                  subtitle: doc.collectionId ? (
                    <DocumentBreadcrumb
                      document={doc}
                      onlyText
                      reverse
                      maxDepth={2}
                    />
                  ) : undefined,
                  section: DocumentsSection,
                  appendSpace: true,
                  attrs: {
                    id: uuidv4(),
                    type: MentionType.Document,
                    modelId: doc.id,
                    actorId,
                    label: doc.title,
                  },
                }) as MentionItem
            )
        )
        .concat(
          collections
            .findByQuery(search, { maxResults: maxResultsInSection })
            .map(
              (collection) =>
                ({
                  name: "mention",
                  icon: collection.icon ? (
                    <Icon
                      value={collection.icon}
                      initial={collection.initial}
                      color={collection.color ?? undefined}
                    />
                  ) : (
                    <CollectionIcon />
                  ),
                  title: collection.name,
                  section: CollectionsSection,
                  appendSpace: true,
                  attrs: {
                    id: uuidv4(),
                    type: MentionType.Collection,
                    modelId: collection.id,
                    actorId,
                    label: collection.name,
                  },
                }) as MentionItem
            )
        )
        .concat([
          {
            name: "link",
            icon: <PlusIcon />,
            title: search?.trim(),
            section: DocumentsSection,
            subtitle: t("Create a new doc"),
            visible: !!search && !isEmail(search),
            priority: -1,
            appendSpace: true,
            attrs: {
              id: uuidv4(),
              type: MentionType.Document,
              modelId: uuidv4(),
              actorId,
              label: search,
            },
          } as MentionItem,
          {
            name: "link",
            icon: <NewDocumentIcon />,
            title: search?.trim(),
            section: DocumentsSection,
            subtitle: t("Create a nested doc"),
            visible: !!search && !isEmail(search) && !!documentId,
            priority: -2,
            appendSpace: true,
            attrs: {
              id: uuidv4(),
              type: MentionType.Document,
              modelId: uuidv4(),
              actorId,
              label: search,
              nested: true,
            },
          } as MentionItem,
        ])
    : [];

  const items: MentionItem[] = [...dateItems, ...mentionItems];

  const handleSelect = useCallback(
    async (item: MentionItem) => {
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
