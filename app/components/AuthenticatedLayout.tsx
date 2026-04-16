import { observer } from "mobx-react";
import * as React from "react";
import { useLocation } from "react-router-dom";
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
import history from "~/utils/history";
import { isModKey } from "@shared/utils/keyboard";
import lazyWithRetry from "~/utils/lazyWithRetry";
import {
  searchPath,
  newDocumentPath,
  settingsPath,
} from "~/utils/routeHelpers";
import { DocumentContextProvider } from "./DocumentContext";
import Fade from "./Fade";
import NotificationBadge from "./NotificationBadge";
import { PortalContext } from "./Portal";
import CommandBar from "./CommandBar";

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
  const canCollection = usePolicy(ui.activeCollectionId);
  const team = useCurrentTeam();
  const [spendPostLoginPath] = usePostLoginPath();

  useKeyDown(".", (event) => {
    if (isModKey(event)) {
      ui.toggleCollapsedSidebar();
    }
  });

  const goToSearch = (ev: KeyboardEvent) => {
    if (!ev.metaKey && !ev.ctrlKey) {
      ev.preventDefault();
      ev.stopPropagation();
      history.push(searchPath());
    }
  };

  const goToNewDocument = (event: KeyboardEvent) => {
    if (event.metaKey || event.altKey) {
      return;
    }
    const { activeCollectionId } = ui;
    if (!activeCollectionId || !canCollection.createDocument) {
      return;
    }
    history.push(newDocumentPath(activeCollectionId));
  };

  React.useEffect(() => {
    const postLoginPath = spendPostLoginPath();
    if (postLoginPath) {
      history.replace(postLoginPath);
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
    <DocumentContextProvider>
      <RightSidebarProvider>
        <PortalContext.Provider value={layoutRef.current}>
          <Layout title={team.name} sidebar={sidebar} ref={layoutRef}>
            <RegisterKeyDown trigger="n" handler={goToNewDocument} />
            <RegisterKeyDown trigger="t" handler={goToSearch} />
            <RegisterKeyDown trigger="/" handler={goToSearch} />
            {children}
            <CommandBar />
            <NotificationBadge />
          </Layout>
        </PortalContext.Provider>
      </RightSidebarProvider>
    </DocumentContextProvider>
  );
};

export default observer(AuthenticatedLayout);
