import { isUndefined } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { ArchiveIcon } from "outline-icons";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Flex from "@shared/components/Flex";
import type Notebook from "~/models/Notebook";
import PaginatedList from "~/components/PaginatedList";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import * as Scenes from "~/routes/scenes";
import { archivePath } from "~/utils/routeHelpers";
import { useDropToArchive } from "../hooks/useDragAndDrop";
import { ArchivedNotebookLink } from "./ArchivedNotebookLink";
import { StyledError } from "./Notebooks";
import PlaceholderNotebooks from "./PlaceholderNotebooks";
import Relative from "./Relative";
import SidebarContext from "./SidebarContext";
import SidebarLink from "./SidebarLink";
function ArchiveLink() {
  const { notebooks } = useStores();
  const { t } = useTranslation();
  const [disclosure, setDisclosure] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean | undefined>();
  const { data, loading, error } = useRequest(notebooks.fetchArchived, true);
  useEffect(() => {
    if (!isUndefined(data) && !loading && isUndefined(error)) {
      setDisclosure(data.length > 0);
    }
  }, [data, loading, error]);
  useEffect(() => {
    setDisclosure(notebooks.archived.length > 0);
  }, [notebooks.archived]);
  useEffect(() => {
    if (disclosure && isUndefined(expanded)) {
      setExpanded(false);
    }
  }, [disclosure, expanded]);
  const handleDisclosureClick = useCallback((ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    setExpanded((e) => !e);
  }, []);
  const handleClick = useCallback(() => {
    setExpanded(true);
  }, []);
  const [{ isOverArchiveSection, isDragging }, dropToArchiveRef] =
    useDropToArchive();
  return (
    <SidebarContext.Provider value="archive">
      <Flex column>
        <div ref={dropToArchiveRef}>
          <SidebarLink
            to={archivePath()}
            onClickIntent={Scenes.Archive.preload}
            icon={<ArchiveIcon open={isOverArchiveSection && isDragging} />}
            exact={false}
            label={t("Archive")}
            isActiveDrop={isOverArchiveSection && isDragging}
            depth={0}
            expanded={disclosure ? expanded : undefined}
            onDisclosureClick={handleDisclosureClick}
            onClick={handleClick}
          />
        </div>
        {expanded === true ? (
          <Relative>
            <PaginatedList<Notebook>
              aria-label={t("Archived notebooks")}
              fetch={notebooks.fetchArchived}
              items={notebooks.archived}
              loading={<PlaceholderNotebooks />}
              renderError={(props) => <StyledError {...props} />}
              renderItem={(item) => (
                <ArchivedNotebookLink key={item.id} depth={2} notebook={item} />
              )}
            />
          </Relative>
        ) : null}
      </Flex>
    </SidebarContext.Provider>
  );
}
export default observer(ArchiveLink);
