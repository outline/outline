import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { $Diff } from "utility-types";
import User from "models/User";
import Avatar from "components/Avatar";
import Badge from "components/Badge";
import Flex from "components/Flex";
import { Props as TableProps } from "components/Table";

import Time from "components/Time";
import useCurrentUser from "hooks/useCurrentUser";
import UserMenu from "menus/UserMenu";

// @ts-expect-error ts-migrate(2344) FIXME: Type 'Props' does not satisfy the constraint 'Comp... Remove this comment to see the full error message
const Table = React.lazy<TableProps>(
  () =>
    import(
      /* webpackChunkName: "table" */
      "components/Table"
    )
);
type Props = $Diff<
  TableProps,
  {
    columns: any;
  }
> & {
  data: User[];
  canManage: boolean;
};

function PeopleTable({ canManage, ...rest }: Props) {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const columns = React.useMemo(
    () =>
      [
        {
          id: "name",
          Header: t("Name"),
          accessor: "name",
          // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'value' implicitly has an 'any' ty... Remove this comment to see the full error message
          Cell: observer(({ value, row }) => (
            <Flex align="center" gap={8}>
              <Avatar src={row.original.avatarUrl} size={32} /> {value}{" "}
              {currentUser.id === row.original.id && `(${t("You")})`}
            </Flex>
          )),
        },
        canManage
          ? {
              id: "email",
              Header: t("Email"),
              accessor: "email",
              // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'value' implicitly has an 'any' ty... Remove this comment to see the full error message
              Cell: observer(({ value }) => value),
            }
          : undefined,
        {
          id: "lastActiveAt",
          Header: t("Last active"),
          accessor: "lastActiveAt",
          Cell: observer(
            // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'value' implicitly has an 'any' ty... Remove this comment to see the full error message
            ({ value }) => value && <Time dateTime={value} addSuffix />
          ),
        },
        {
          id: "isAdmin",
          Header: t("Role"),
          accessor: "rank",
          // @ts-expect-error ts-migrate(7031) FIXME: Binding element 'row' implicitly has an 'any' type... Remove this comment to see the full error message
          Cell: observer(({ row }) => (
            <Badges>
              {!row.original.lastActiveAt && <Badge>{t("Invited")}</Badge>}
              // @ts-expect-error ts-migrate(2769) FIXME: No overload matches
              this call.
              {row.original.isAdmin && <Badge primary>{t("Admin")}</Badge>}
              {row.original.isViewer && <Badge>{t("Viewer")}</Badge>}
              {row.original.isSuspended && <Badge>{t("Suspended")}</Badge>}
            </Badges>
          )),
        },
        canManage
          ? {
              Header: " ",
              accessor: "id",
              className: "actions",
              Cell: observer(
                // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '({ row, value }: { row: any; val... Remove this comment to see the full error message
                ({ row, value }) =>
                  currentUser.id !== value && <UserMenu user={row.original} />
              ),
            }
          : undefined,
      ].filter((i) => i),
    [t, canManage, currentUser]
  );
  // @ts-expect-error ts-migrate(2322) FIXME: Type '{ data: any[] & User[]; offset?: number | un... Remove this comment to see the full error message
  return <Table columns={columns} {...rest} />;
}

const Badges = styled.div`
  margin-left: -10px;
`;

export default PeopleTable;
