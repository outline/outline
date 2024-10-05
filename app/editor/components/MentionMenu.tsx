import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { v4 } from "uuid";
import { MenuItem } from "@shared/editor/types";
import { MentionType } from "@shared/types";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import Icon from "~/components/Icon";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import MentionMenuItem from "./MentionMenuItem";
import SuggestionsMenu, {
  Props as SuggestionsMenuProps,
} from "./SuggestionsMenu";

interface MentionItem extends MenuItem {
  appendSpace: boolean;
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
  "renderMenuItem" | "items" | "embeds" | "trigger"
>;

function MentionMenu({ search, isActive, ...rest }: Props) {
  const [loaded, setLoaded] = React.useState(false);
  const [items, setItems] = React.useState<MentionItem[]>([]);
  const { t } = useTranslation();
  const { auth, documents, users } = useStores();
  const location = useLocation();
  const documentId = parseDocumentSlug(location.pathname);
  const { data, loading, request } = useRequest(
    React.useCallback(
      () =>
        documentId
          ? users.fetchPage({ id: documentId, query: search })
          : Promise.resolve([]),
      [users, documentId, search]
    )
  );

  React.useEffect(() => {
    if (isActive) {
      void request();
    }
  }, [request, isActive]);

  React.useEffect(() => {
    if (data && !loading) {
      const items = data
        .map((user) => ({
          name: "mention",
          icon: (
            <Flex
              align="center"
              justify="center"
              style={{ width: 24, height: 24 }}
            >
              <Avatar
                model={user}
                showBorder={false}
                alt={t("Profile picture")}
                size={AvatarSize.Small}
              />
            </Flex>
          ),
          title: user.name,
          appendSpace: true,
          attrs: {
            id: v4(),
            type: MentionType.User,
            modelId: user.id,
            actorId: auth.currentUserId ?? undefined,
            label: user.name,
          },
        }))
        .concat(
          documents.orderedData.map((doc) => ({
            name: "mention",
            icon: doc.icon ? (
              <Icon value={doc.icon} color={doc.color ?? undefined} />
            ) : (
              <DocumentIcon />
            ),
            title: doc.title,
            appendSpace: true,
            attrs: {
              id: v4(),
              type: MentionType.Document,
              modelId: doc.id,
              actorId: auth.currentUserId ?? undefined,
              label: doc.title,
            },
          }))
        );

      setItems(items);
      setLoaded(true);
    }
  }, [auth.currentUserId, loading, data]);

  const handleSelect = React.useCallback(
    async (item: MentionItem) => {
      if (item.attrs.type === MentionType.Document) {
        return;
      }
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
    },
    [t, users, documentId]
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
      trigger="@"
      search={search}
      onSelect={handleSelect}
      renderMenuItem={(item, _index, options) => (
        <MentionMenuItem
          onClick={options.onClick}
          selected={options.selected}
          title={item.title}
          label={item.attrs.label}
          icon={item.icon}
        />
      )}
      items={items}
    />
  );
}

export default observer(MentionMenu);
