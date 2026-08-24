import { observer } from "mobx-react";
import * as React from "react";
import { DndProvider } from "react-dnd";
import { useLocation } from "react-router-dom";
import { EditorAwareHTML5Backend } from "~/components/EditorAwareHTML5Backend";
import ErrorSuspended from "~/scenes/Errors/ErrorSuspended";
import Layout from "~/components/Layout";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import { RightSidebarProvider } from "~/components/RightSidebarContext";
import Sidebar from "~/components/Sidebar";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useKeyDown from "~/hooks/useKeyDown";
import { usePostLoginPath } from "~/hooks/useLastVisitedPath";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import Logger from "~/utils/Logger";
import history from "~/utils/history";
import lazyWithRetry from "~/utils/lazyWithRetry";
import {
  searchPath,
  newNotePath,
  settingsPath,
  homePath,
} from "~/utils/routeHelpers";
import { NoteContextProvider } from "./NoteContext";
import Fade from "./Fade";
import { PortalContext } from "./Portal";
const SettingsSidebar = lazyWithRetry(
  () => import("~/components/Sidebar/Settings")
);
type Props = {
  children?: React.ReactNode;
};
const AuthenticatedLayout: React.FC = ({ children }: Props) => {
  const { ui, auth } = useStores();
  const location = useLocation();
  const layoutRef = React.useRef<HTMLDivElement>(null);
  const canNotebook = usePolicy(ui.activeNotebookId);
  const team = useCurrentTeam();
  const [spendPostLoginPath] = usePostLoginPath();
  useKeyDown(".", () => ui.toggleCollapsedSidebar(), { metaKey: true });
  const goToSearch = (ev: KeyboardEvent) => {
    if (!ev.metaKey && !ev.ctrlKey) {
      ev.preventDefault();
      ev.stopPropagation();
      history.push(searchPath());
    }
  };
  const goToNewNote = (event: KeyboardEvent) => {
    if (event.metaKey || event.altKey) {
      return;
    }
    const { activeNotebookId } = ui;
    if (!activeNotebookId || !canNotebook.createNote) {
      return;
    }
    history.push(newNotePath(activeNotebookId));
  };
  React.useEffect(() => {
    const postLoginPath = spendPostLoginPath();
    if (postLoginPath) {
      try {
        history.replace(postLoginPath);
      } catch (err) {
        Logger.warn("Failed to navigate to post login path, falling back", {
          path: postLoginPath,
          error: err,
        });
        history.replace(homePath());
      }
    }
  }, [spendPostLoginPath]);
  if (auth.isSuspended) {
    return <ErrorSuspended />;
  }
  const isSettings = location.pathname.startsWith(settingsPath());
  const sidebar = (
    <Fade>
      <React.Suspense fallback={null}>
        {isSettings && <SettingsSidebar />}
      </React.Suspense>
      <div style={isSettings ? { display: "none" } : undefined}>
        <Sidebar />
      </div>
    </Fade>
  );
  return (
    <NoteContextProvider>
      <RightSidebarProvider>
        <PortalContext.Provider value={layoutRef.current}>
          <DndProvider backend={EditorAwareHTML5Backend}>
            <Layout
              title={team.name}
              sidebar={sidebar}
              sidebarCanCollapse={!isSettings}
              ref={layoutRef}
            >
              <RegisterKeyDown trigger="n" handler={goToNewNote} />
              <RegisterKeyDown trigger="t" handler={goToSearch} />
              <RegisterKeyDown trigger="/" handler={goToSearch} />
              {children}
            </Layout>
          </DndProvider>
        </PortalContext.Provider>
      </RightSidebarProvider>
    </NoteContextProvider>
  );
};
export default observer(AuthenticatedLayout);
