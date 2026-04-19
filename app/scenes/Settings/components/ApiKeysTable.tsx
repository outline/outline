import { observer } from "mobx-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type ApiKey from "~/models/ApiKey";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Badge from "~/components/Badge";
import { HEADER_HEIGHT } from "~/components/Header";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import Text from "~/components/Text";
import Time from "~/components/Time";
import Tooltip from "~/components/Tooltip";
import useUserLocale from "~/hooks/useUserLocale";
import ApiKeyMenu from "~/menus/ApiKeyMenu";
import { HStack } from "~/components/primitives/HStack";
import { dateToExpiry } from "~/utils/date";
import { FILTER_HEIGHT } from "./StickyFilters";

const ROW_HEIGHT = 50;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<ApiKey>, "columns" | "rowHeight">;

export const ApiKeysTable = observer(function ApiKeysTable(props: Props) {
  const { t } = useTranslation();
  const userLocale = useUserLocale();

  const columns = useMemo<TableColumn<ApiKey>[]>(
    () => [
      {
        type: "data",
        id: "name",
        header: t("Name"),
        accessor: (apiKey) => apiKey.name,
        component: (apiKey) => (
          <HStack spacing={4} wrap>
            <Text selectable>{apiKey.name}</Text>
            {apiKey.scope && (
              <Tooltip
                content={apiKey.scope.map((s) => (
                  <span key={s}>
                    {s}
                    <br />
                  </span>
                ))}
              >
                <Badge>{t("Restricted scope")}</Badge>
              </Tooltip>
            )}
          </HStack>
        ),
        width: "3fr",
      },
      {
        type: "data",
        id: "value",
        header: t("Key"),
        sortable: false,
        accessor: (apiKey) => apiKey.obfuscatedValue,
        component: (apiKey) => (
          <Text type="tertiary" monospace>
            {apiKey.obfuscatedValue}
          </Text>
        ),
        width: "2fr",
      },
      {
        type: "data",
        id: "user",
        header: t("Created by"),
        accessor: (apiKey) => apiKey.user?.name,
        component: (apiKey) =>
          apiKey.user ? (
            <HStack>
              <Avatar model={apiKey.user} size={AvatarSize.Medium} />
              <Text selectable>{apiKey.user.name}</Text>
            </HStack>
          ) : null,
        width: "2fr",
      },
      {
        type: "data",
        id: "lastActiveAt",
        header: t("Last used"),
        accessor: (apiKey) => apiKey.lastActiveAt,
        component: (apiKey) =>
          apiKey.lastActiveAt ? (
            <Time dateTime={apiKey.lastActiveAt} addSuffix shorten />
          ) : (
            <Text type="tertiary">{t("Never")}</Text>
          ),
        width: "1.5fr",
      },
      {
        type: "data",
        id: "expiresAt",
        header: t("Expires"),
        accessor: (apiKey) => apiKey.expiresAt,
        component: (apiKey) =>
          apiKey.isExpired ? (
            <Text type="danger">
              {t("Expired")} <Time dateTime={apiKey.expiresAt!} addSuffix />
            </Text>
          ) : apiKey.expiresAt ? (
            <Text type="tertiary">
              {dateToExpiry(apiKey.expiresAt, t, userLocale)}
            </Text>
          ) : (
            <Text type="tertiary">{t("No expiry")}</Text>
          ),
        width: "1.5fr",
      },
      {
        type: "action",
        id: "action",
        component: (apiKey) => <ApiKeyMenu apiKey={apiKey} />,
        width: "50px",
      },
    ],
    [t, userLocale]
  );

  return (
    <SortableTable
      columns={columns}
      rowHeight={ROW_HEIGHT}
      stickyOffset={STICKY_OFFSET}
      {...props}
    />
  );
});
