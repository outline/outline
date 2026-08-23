import fractionalIndex from "fractional-index";
import { observer } from "mobx-react";
import { useMemo } from "react";
import { useDrop } from "react-dnd";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import type Notebook from "~/models/Notebook";
import Flex from "~/components/Flex";
import Error from "~/components/List/Error";
import PaginatedList from "~/components/PaginatedList";
import { createNotebook } from "~/actions/definitions/notebooks";
import useStores from "~/hooks/useStores";
import type { DragObject } from "../hooks/useDragAndDrop";
import DraggableNotebookLink from "./DraggableNotebookLink";
import DropCursor from "./DropCursor";
import Header from "./Header";
import PlaceholderNotebooks from "./PlaceholderNotebooks";
import Relative from "./Relative";
import SidebarAction from "./SidebarAction";
import SidebarContext from "./SidebarContext";
import SidebarLink from "./SidebarLink";
import Text from "@shared/components/Text";
import usePolicy from "~/hooks/usePolicy";
function Notebooks() {
  const { notes, auth, notebooks, policies } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(auth.team?.id);
  const orderedNotebooks = notebooks.allActive;
  const params = useMemo(
    () => ({
      limit: 100,
    }),
    []
  );
  const [{ isNotebookDropping, isDraggingAnyNotebook }, dropToReorderNotebook] =
    useDrop({
      accept: "collection",
      drop: async (item: DragObject) => {
        void notebooks.move(
          item.id,
          fractionalIndex(null, orderedNotebooks[0].index)
        );
      },
      canDrop: (item) =>
        item.id !== orderedNotebooks[0]?.id &&
        !!policies.abilities(item.id).move,
      collect: (monitor) => ({
        isNotebookDropping: monitor.isOver(),
        isDraggingAnyNotebook: monitor.canDrop(),
      }),
    });
  return (
    <SidebarContext.Provider value="notebooks">
      <Flex column>
        <Header id="notebooks" title={t("Notebooks")}>
          <Relative>
            <PaginatedList<Notebook>
              options={params}
              aria-label={t("Notebooks")}
              items={orderedNotebooks}
              loading={<PlaceholderNotebooks />}
              heading={
                isDraggingAnyNotebook ? (
                  <DropCursor
                    isActiveDrop={isNotebookDropping}
                    innerRef={dropToReorderNotebook}
                    position="top"
                  />
                ) : undefined
              }
              empty={
                // No need for empty state if we're displaying the createCollection action
                can.createNotebook ? null : (
                  <SidebarLink
                    label={
                      <Text type="tertiary" size="small" italic>
                        {t("No notebooks")}
                      </Text>
                    }
                    onClick={() => {}}
                    depth={1.5}
                  />
                )
              }
              renderError={(props) => <StyledError {...props} />}
              renderItem={(item, index) => (
                <DraggableNotebookLink
                  key={item.id}
                  notebook={item}
                  activeNote={notes.active}
                  belowNotebook={orderedNotebooks[index + 1]}
                />
              )}
            />
            <SidebarAction action={createNotebook} depth={0} />
          </Relative>
        </Header>
      </Flex>
    </SidebarContext.Provider>
  );
}
export const StyledError = styled(Error)`
  font-size: 15px;
  padding: 0 8px;
`;
export default observer(Notebooks);
