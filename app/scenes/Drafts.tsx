import { observer } from "mobx-react";
import { DraftsIcon } from "outline-icons";
import queryString from "query-string";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import styled from "styled-components";
import type { DateFilter as TDateFilter } from "@shared/types";
import NotebookFilter from "~/scenes/Search/components/NotebookFilter";
import { Action } from "~/components/Actions";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import InputSearchPage from "~/components/InputSearchPage";
import PaginatedNoteList from "~/components/PaginatedNoteList";
import Scene from "~/components/Scene";
import Subheading from "~/components/Subheading";
import useStores from "~/hooks/useStores";
import NewNoteMenu from "~/menus/NewNoteMenu";
import DateFilter from "./Search/components/DateFilter";
function Drafts() {
  const { t } = useTranslation();
  const { notes } = useStores();
  const history = useHistory();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const notebookId = params.get("collectionId") || undefined;
  const dateFilter = (params.get("dateFilter") || undefined) as TDateFilter;
  const handleFilterChange = (search: {
    dateFilter?: string | null | undefined;
    notebookId?: string | null | undefined;
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
  const isFiltered = notebookId || dateFilter;
  const options = {
    dateFilter,
    notebookId,
  };
  return (
    <Scene
      icon={<DraftsIcon />}
      title={t("Drafts")}
      left={<InputSearchPage source="drafts" label={t("Search notes")} />}
      actions={
        <Action>
          <NewNoteMenu />
        </Action>
      }
    >
      <Heading>{t("Drafts")}</Heading>
      <Subheading sticky>
        {t("Notes")}
        <Filters>
          <NotebookFilter
            notebookId={notebookId}
            onSelect={(notebookId) =>
              handleFilterChange({
                notebookId,
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

      <PaginatedNoteList
        empty={
          <Empty>
            {isFiltered
              ? t("No notes found for your filters.")
              : t("You’ve not got any drafts at the moment.")}
          </Empty>
        }
        fetch={notes.fetchDrafts}
        notes={notes.drafts(options)}
        options={options}
        showParentNotes
        showNotebook
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
export default observer(Drafts);
