import { observer } from "mobx-react";
import { ArchiveIcon } from "outline-icons";
import * as React from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Flex from "@shared/components/Flex";
import Collection from "~/models/Collection";
import PaginatedList from "~/components/PaginatedList";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { archivePath } from "~/utils/routeHelpers";
import { ArchivedCollectionLink } from "./ArchivedCollectionLink";
import { StyledError } from "./Collections";
import PlaceholderCollections from "./PlaceholderCollections";
import Relative from "./Relative";
import SidebarLink, { DragObject } from "./SidebarLink";

function ArchiveLink() {
  const { policies, documents, collections } = useStores();
  const { t } = useTranslation();

  const [expanded, setExpanded] = React.useState(false);

  const { request } = useRequest(collections.fetchArchived);

  React.useEffect(() => {
    if (expanded) {
      void request();
    }
  }, [expanded, request]);

  const handleDisclosureClick = React.useCallback((ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    setExpanded((e) => !e);
  }, []);

  const handleClick = React.useCallback(() => {
    setExpanded(true);
  }, []);

  const [{ isDocumentDropping }, dropToArchiveDocument] = useDrop({
    accept: "document",
    drop: async (item: DragObject) => {
      const document = documents.get(item.id);
      await document?.archive();
      toast.success(t("Document archived"));
    },
    canDrop: (item) => policies.abilities(item.id).archive,
    collect: (monitor) => ({
      isDocumentDropping: monitor.isOver(),
    }),
  });

  return (
    <Flex column>
      <div ref={dropToArchiveDocument}>
        <SidebarLink
          to={archivePath()}
          icon={<ArchiveIcon open={isDocumentDropping} />}
          exact={false}
          label={t("Archive")}
          active={documents.active?.isArchived && !documents.active?.isDeleted}
          isActiveDrop={isDocumentDropping}
          depth={0}
          expanded={expanded}
          onDisclosureClick={handleDisclosureClick}
          onClick={handleClick}
        />
      </div>
      {expanded ? (
        <Relative>
          <PaginatedList
            aria-label={t("Archived collections")}
            items={collections.archived}
            loading={<PlaceholderCollections />}
            renderError={(props) => <StyledError {...props} />}
            renderItem={(item: Collection) => (
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
  );
}

export default observer(ArchiveLink);
