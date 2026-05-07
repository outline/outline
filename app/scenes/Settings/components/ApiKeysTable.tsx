import { observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import type ApiKey from "~/models/ApiKey";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Badge from "~/components/Badge";
import CopyToClipboard from "~/components/CopyToClipboard";
import { HEADER_HEIGHT } from "~/components/Header";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import {
  type Props as TableProps,
  SortableTable,
} from "~/components/SortableTable";
import { type Column as TableColumn } from "~/components/Table";
import Text from "~/components/Text";
import Time from "~/components/Time";
import Tooltip from "~/components/Tooltip";
import { useApiKeyMenuActions } from "~/hooks/useApiKeyMenuActions";
import useUserLocale from "~/hooks/useUserLocale";
import ApiKeyMenu from "~/menus/ApiKeyMenu";
import { HStack } from "~/components/primitives/HStack";
import { dateToExpiry } from "~/utils/date";
import { FILTER_HEIGHT } from "./StickyFilters";
import { CopyIcon } from "outline-icons";

const ROW_HEIGHT = 50;
const STICKY_OFFSET = HEADER_HEIGHT + FILTER_HEIGHT;

type Props = Omit<TableProps<ApiKey>, "columns" | "rowHeight">;

const ApiKeyRowContextMenu = observer(function ApiKeyRowContextMenu({
  apiKey,
  menuLabel,
  children,
}: {
  apiKey: ApiKey;
  menuLabel: string;
  children: React.ReactNode;
}) {
  const action = useApiKeyMenuActions(apiKey);
  return (
    <ContextMenu action={action} ariaLabel={menuLabel}>
      {children}
    </ContextMenu>
  );
});

export const ApiKeysTable = observer(function ApiKeysTable(props: Props) {
  const { t } = useTranslation();
  const userLocale = useUserLocale();

  const applyContextMenu = useCallback(
    (apiKey: ApiKey, rowElement: React.ReactNode) => (
      <ApiKeyRowContextMenu apiKey={apiKey} menuLabel={t("API key")}>
        {rowElement}
      </ApiKeyRowContextMenu>
    ),
    [t]
  );

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
        component: (apiKey) =>
          apiKey.value ? (
            <CopyToClipboard
              text={apiKey.value}
              onCopy={() => toast.success(t("API key copied"))}
            >
              <CopyableText type="tertiary" as="div" monospace selectable>
                <CopyIcon />
                &nbsp;{apiKey.value}
              </CopyableText>
            </CopyToClipboard>
          ) : (
            <Text type="tertiary" monospace>
              {apiKey.obfuscatedValue}
            </Text>
          ),
        width: "2.5fr",
      },
      {
        type: "data",
        id: "userId",
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
      decorateRow={applyContextMenu}
      {...props}
    />
  );
});

const CopyableText = styled(Text)`
  cursor: pointer;
  display: flex;
  align-items: center;

  svg {
    flex-shrink: 0;
  }

  &:hover {
    color: ${(props) => props.theme.text};
  }
`;
