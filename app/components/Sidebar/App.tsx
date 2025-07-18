import { observer } from "mobx-react";
import { SearchIcon, HomeIcon, SidebarIcon, PlusIcon } from "outline-icons";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { metaDisplay } from "@shared/utils/keyboard";
import Scrollable from "~/components/Scrollable";
import { inviteUser } from "~/actions/definitions/users";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import TeamMenu from "~/menus/TeamMenu";
import { homePath, searchPath, documentPath } from "~/utils/routeHelpers";
import TeamLogo from "../TeamLogo";
import Tooltip from "../Tooltip";
import Sidebar from "./Sidebar";
import ArchiveLink from "./components/ArchiveLink";
import Collections from "./components/Collections";
import { DraftsLink } from "./components/DraftsLink";
import DragPlaceholder from "./components/DragPlaceholder";
import HistoryNavigation from "./components/HistoryNavigation";
import Section from "./components/Section";
import SharedWithMe from "./components/SharedWithMe";
import SidebarAction from "./components/SidebarAction";
import SidebarButton, { SidebarButtonProps } from "./components/SidebarButton";
import SidebarLink from "./components/SidebarLink";
import Starred from "./components/Starred";
import ToggleButton from "./components/ToggleButton";
import TrashLink from "./components/TrashLink";

function AppSidebar() {
  const { t } = useTranslation();
  const { documents, ui, collections } = useStores();
  const history = useHistory();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const can = usePolicy(team);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const document = await documents.create({
      title: file.name,
      text: "",
      documentType: "research-paper",
    });

    history.push(documentPath(document));
  };

  useEffect(() => {
    void collections.fetchAll();

    if (!user.isViewer) {
      void documents.fetchDrafts();
    }
  }, [documents, collections, user.isViewer]);

  const [dndArea, setDndArea] = useState();
  const handleSidebarRef = useCallback((node) => setDndArea(node), []);
  const html5Options = useMemo(
    () => ({
      rootElement: dndArea,
    }),
    [dndArea]
  );

  return (
    <Sidebar hidden={!ui.readyToShow} ref={handleSidebarRef}>
      <HistoryNavigation />
      {dndArea && (
        <DndProvider backend={HTML5Backend} options={html5Options}>
          <DragPlaceholder />

          <TeamMenu>
            {(props: SidebarButtonProps) => (
              <SidebarButton
                {...props}
                title={team.name}
                image={
                  <TeamLogo
                    model={team}
                    size={24}
                    alt={t("Logo")}
                    style={{ marginLeft: 4 }}
                  />
                }
              >
                <Tooltip
                  content={t("Toggle sidebar")}
                  shortcut={`${metaDisplay}+.`}
                >
                  <ToggleButton
                    position="bottom"
                    image={<SidebarIcon />}
                    onClick={() => {
                      ui.toggleCollapsedSidebar();
                      (document.activeElement as HTMLElement)?.blur();
                    }}
                  />
                </Tooltip>
              </SidebarButton>
            )}
          </TeamMenu>
          <Overflow>
            <Section>
              <SidebarLink
                to={homePath()}
                icon={<HomeIcon />}
                exact={false}
                label={t("Home")}
              />
              <SidebarLink
                to={searchPath()}
                icon={<SearchIcon />}
                label={t("Search")}
                exact={false}
              />
              <SidebarButton
                onClick={handleUpload}
                icon={<PlusIcon />}
                label={t("Upload")}
              />
              {can.createDocument && <DraftsLink />}
            </Section>
          </Overflow>
          <Scrollable flex shadow>
            <Section>
              <Starred />
            </Section>
            <Section>
              <SharedWithMe />
            </Section>
            <Section>
              <Collections />
            </Section>
            {can.createDocument && (
              <Section auto>
                <ArchiveLink />
              </Section>
            )}
            <Section>
              {can.createDocument && <TrashLink />}
              <SidebarAction action={inviteUser} />
            </Section>
          </Scrollable>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
            accept=".pdf"
          />
        </DndProvider>
      )}
    </Sidebar>
  );
}

const Overflow = styled.div`
  overflow: hidden;
  flex-shrink: 0;
`;

export default observer(AppSidebar);
