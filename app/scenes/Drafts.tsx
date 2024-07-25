import { observer } from "mobx-react";
import { DraftsIcon } from "outline-icons";
import queryString from "query-string";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import { DateFilter as TDateFilter } from "@shared/types";
import CollectionFilter from "~/scenes/Search/components/CollectionFilter";
import { Action } from "~/components/Actions";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import InputSearchPage from "~/components/InputSearchPage";
import PaginatedDocumentList from "~/components/PaginatedDocumentList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import useStores from "~/hooks/useStores";
import NewDocumentMenu from "~/menus/NewDocumentMenu";
import DateFilter from "./Search/components/DateFilter";

function Drafts() {
  const { t } = useTranslation();
  const { documents } = useStores();
  const history = useHistory();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const collectionId = params.get("collectionId") || undefined;
  const dateFilter = (params.get("dateFilter") || undefined) as TDateFilter;

  const handleFilterChange = (search: {
    dateFilter?: string | null | undefined;
    collectionId?: string | null | undefined;
  }) => {
    history.replace({
      pathname: location.pathname,
      search: queryString.stringify(
        { ...queryString.parse(location.search), ...search },
        {
          skipEmptyString: true,
        }
      ),
    });
  };

  const isFiltered = collectionId || dateFilter;
  const options = {
    dateFilter,
    collectionId,
  };

  return (
    <Scene
      icon={<DraftsIcon />}
      title={t("Drafts")}
      left={<InputSearchPage source="drafts" label={t("Search documents")} />}
      actions={
        <Action>
          <NewDocumentMenu />
        </Action>
      }
    >
      <Heading>{t("Drafts")}</Heading>
      <Subheading sticky>
        {t("Documents")}
        <Filters>
          <CollectionFilter
            collectionId={collectionId}
            onSelect={(collectionId) =>
              handleFilterChange({
                collectionId,
              })
            }
          />
          <DateFilter
            dateFilter={dateFilter}
            onSelect={(dateFilter) =>
              handleFilterChange({
                dateFilter,
              })
            }
          />
        </Filters>
      </Subheading>

      <PaginatedDocumentList
        empty={
          <Empty>
            {isFiltered
              ? t("No documents found for your filters.")
              : t("You’ve not got any drafts at the moment.")}
          </Empty>
        }
        fetch={documents.fetchDrafts}
        documents={documents.drafts(options)}
        options={options}
        showParentDocuments
        showCollection
      />
    </Scene>
  );
}

const Filters = styled(Flex)`
  opacity: 0.85;
  transition: opacity 100ms ease-in-out;
  position: absolute;
  right: -8px;
  bottom: 0;
  padding: 0 0 6px;

  &:hover {
    opacity: 1;
  }
`;

export default observer(Drafts);
