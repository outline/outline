import isUndefined from "lodash/isUndefined";
import { observer } from "mobx-react";
import { ArchiveIcon } from "outline-icons";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Flex from "@shared/components/Flex";
import Collection from "~/models/Collection";
import PaginatedList from "~/components/PaginatedList";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { archivePath } from "~/utils/routeHelpers";
import { useDropToArchive } from "../hooks/useDragAndDrop";
import { ArchivedCollectionLink } from "./ArchivedCollectionLink";
import { StyledError } from "./Collections";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SidebarContext from "./SidebarContext";
import SidebarLink from "./SidebarLink";

function ArchiveLink() {
  const { collections } = useStores();
  const { t } = useTranslation();

  const [disclosure, setDisclosure] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean | undefined>();

  const { request, data, loading, error } = useRequest(
    collections.fetchArchived,
    true
  );

  useEffect(() => {
    if (!isUndefined(data) && !loading && isUndefined(error)) {
      setDisclosure(data.length > 0);
    }
  }, [data, loading, error]);

  useEffect(() => {
    setDisclosure(collections.archived.length > 0);
  }, [collections.archived]);

  useEffect(() => {
    if (disclosure && isUndefined(expanded)) {
      setExpanded(false);
    }
  }, [disclosure]);

  useEffect(() => {
    if (expanded) {
      void request();
    }
  }, [expanded, request]);

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
            <PaginatedList<Collection>
              aria-label={t("Archived collections")}
              items={collections.archived}
              loading={<PlaceholderCollections />}
              renderError={(props) => <StyledError {...props} />}
              renderItem={(item) => (
                <ArchivedCollectionLink
                  key={item.id}
                  depth={1}
                  collection={item}
                />
              )}
            />
          </Relative>
        ) : null}
      </Flex>
    </SidebarContext.Provider>
  );
}

export default observer(ArchiveLink);
