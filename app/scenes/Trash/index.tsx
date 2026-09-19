import { observer } from "mobx-react";
import { TrashIcon } from "outline-icons";
import queryString from "query-string";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import type { Filter } from "@shared/helpers/FilterHelper";
import { DURATION_BY_DATE_FILTER } from "@shared/helpers/FilterHelper";
import type { DateFilter as TDateFilter } from "@shared/types";
import DateFilter from "~/scenes/Search/components/DateFilter";
import UserFilter from "~/scenes/Search/components/UserFilter";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import TrashMenu from "~/menus/TrashMenu";

function Trash() {
  const { t } = useTranslation();
  const { documents } = useStores();
  const user = useCurrentUser();
  const history = useHistory();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  // An absent param defaults to the documents deleted by the current user, an
  // empty one means documents deleted by anyone.
  const userId = params.has("userId")
    ? params.get("userId") || undefined
    : user.id;
  const dateFilter = (params.get("dateFilter") || undefined) as TDateFilter;

  const handleFilterChange = (search: {
    dateFilter?: string | null;
    userId?: string | null;
  }) => {
    history.replace({
      pathname: location.pathname,
      search: queryString.stringify({
        ...queryString.parse(location.search),
        ...search,
      }),
    });
  };

  const options = useMemo(() => {
    const filters: Filter[] = [];
    if (userId) {
      filters.push({ field: "deletedById", operator: "eq", value: userId });
    }
    if (dateFilter) {
      filters.push({
        field: "deletedAt",
        operator: "gte",
        value: DURATION_BY_DATE_FILTER[dateFilter],
      });
    }
    return filters.length ? { filters } : {};
  }, [userId, dateFilter]);

  const getEmptyMessage = () => {
    if (dateFilter) {
      return t("No documents found for your filters.");
    }
    if (userId === user.id) {
      return t("You’ve not deleted any documents.");
    }
    if (userId) {
      return t("This user has not deleted any documents.");
    }
    return t("Trash is empty at the moment.");
  };

  return (
    <Scene icon={<TrashIcon />} title={t("Trash")} actions={<TrashMenu />}>
      <Heading>{t("Trash")}</Heading>
      <Subheading sticky>
        {t("Recently deleted")}
        <Filters>
          <UserFilter
            userId={userId ?? ""}
            anyLabel={t("Deleted by anyone")}
            onSelect={(userId) => handleFilterChange({ userId: userId ?? "" })}
          />
          <DateFilter
            dateFilter={dateFilter}
            onSelect={(dateFilter) => handleFilterChange({ dateFilter })}
          />
        </Filters>
      </Subheading>
      <PaginatedDocumentList
        documents={documents.deleted({ userId, dateFilter })}
        fetch={documents.fetchDeleted}
        options={options}
        empty={<Empty>{getEmptyMessage()}</Empty>}
        showCollection
        showTemplate
      />
    </Scene>
  );
}

const Filters = styled(Flex)`
  opacity: 0.85;
  transition: opacity 100ms ease-in-out;
  position: absolute;
  right: 0;
  bottom: 0;
  padding: 0 0 6px;
  gap: 4px;

  &:hover {
    opacity: 1;
  }
`;

export default observer(Trash);
