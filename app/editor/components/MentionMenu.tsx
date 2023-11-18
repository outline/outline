import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { v4 } from "uuid";
import { MenuItem } from "@shared/editor/types";
import { MentionType } from "@shared/types";
import parseDocumentSlug from "@shared/utils/parseDocumentSlug";
import User from "~/models/User";
import Avatar from "~/components/Avatar";
import { AvatarSize } from "~/components/Avatar/Avatar";
import Flex from "~/components/Flex";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import MentionMenuItem from "./MentionMenuItem";
import SuggestionsMenu, {
  Props as SuggestionsMenuProps,
} from "./SuggestionsMenu";

interface MentionItem extends MenuItem {
  name: string;
  user: User;
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
  const { auth, users } = useStores();
  const location = useLocation();
  const documentId = parseDocumentSlug(location.pathname);
  const { data, loading, request } = useRequest(
    React.useCallback(
      () =>
        documentId
          ? users.fetchDocumentUsers({ id: documentId, query: search })
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
      const items = data.map((user) => ({
        name: "mention",
        user,
        title: user.name,
        appendSpace: true,
        attrs: {
          id: v4(),
          type: MentionType.User,
          modelId: user.id,
          actorId: auth.currentUserId ?? undefined,
          label: user.name,
        },
      }));

      setItems(items);
      setLoaded(true);
    }
  }, [auth.currentUserId, loading, data]);

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
      renderMenuItem={(item, _index, options) => (
        <MentionMenuItem
          onClick={options.onClick}
          selected={options.selected}
          title={item.title}
          label={item.attrs.label}
          icon={
            <Flex
              align="center"
              justify="center"
              style={{ width: 24, height: 24 }}
            >
              <Avatar
                model={item.user}
                showBorder={false}
                alt={t("Profile picture")}
                size={AvatarSize.Small}
              />
            </Flex>
          }
        />
      )}
      items={items}
    />
  );
}

export default observer(MentionMenu);
