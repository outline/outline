import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import * as React from "react";
import { Switch, Route, useLocation, matchPath } from "react-router-dom";
import { TeamPreference } from "@shared/types";
import ErrorSuspended from "~/scenes/ErrorSuspended";
import Layout from "~/components/Layout";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import Sidebar from "~/components/Sidebar";
import SidebarRight from "~/components/Sidebar/Right";
import SettingsSidebar from "~/components/Sidebar/Settings";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import lazyWithRetry from "~/utils/lazyWithRetry";
import {
  searchPath,
  newDocumentPath,
  settingsPath,
  matchDocumentHistory,
  matchDocumentSlug as slug,
  matchDocumentInsights,
} from "~/utils/routeHelpers";
import { DocumentContextProvider } from "./DocumentContext";
import Fade from "./Fade";
import { PortalContext } from "./Portal";

const DocumentComments = lazyWithRetry(
  () => import("~/scenes/Document/components/Comments")
);
const DocumentHistory = lazyWithRetry(
  () => import("~/scenes/Document/components/History")
);
const DocumentInsights = lazyWithRetry(
  () => import("~/scenes/Document/components/Insights")
);
const CommandBar = lazyWithRetry(() => import("~/components/CommandBar"));

type Props = {
  children?: React.ReactNode;
};

const AuthenticatedLayout: React.FC = ({ children }: Props) => {
  const { ui, auth } = useStores();
  const location = useLocation();
  const layoutRef = React.useRef<HTMLDivElement>(null);
  const can = usePolicy(ui.activeDocumentId);
  const canCollection = usePolicy(ui.activeCollectionId);
  const team = useCurrentTeam();

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

  if (auth.isSuspended) {
    return <ErrorSuspended />;
  }

  const sidebar = (
    <Fade>
      <Switch>
        <Route path={settingsPath()} component={SettingsSidebar} />
        <Route component={Sidebar} />
      </Switch>
    </Fade>
  );

  const showHistory =
    !!matchPath(location.pathname, {
      path: matchDocumentHistory,
    }) && can.listRevisions;
  const showInsights =
    !!matchPath(location.pathname, {
      path: matchDocumentInsights,
    }) && can.listViews;
  const showComments =
    !showInsights &&
    !showHistory &&
    can.comment &&
    ui.activeDocumentId &&
    ui.commentsExpanded &&
    team.getPreference(TeamPreference.Commenting);

  const sidebarRight = (
    <AnimatePresence
      initial={false}
      key={ui.activeDocumentId ? "active" : "inactive"}
    >
      {(showHistory || showInsights || showComments) && (
        <Route path={`/doc/${slug}`}>
          <SidebarRight>
            <React.Suspense fallback={null}>
              {showHistory && <DocumentHistory />}
              {showInsights && <DocumentInsights />}
              {showComments && <DocumentComments />}
            </React.Suspense>
          </SidebarRight>
        </Route>
      )}
    </AnimatePresence>
  );

  return (
    <DocumentContextProvider>
      <PortalContext.Provider value={layoutRef.current}>
        <Layout
          title={team.name}
          sidebar={sidebar}
          sidebarRight={sidebarRight}
          ref={layoutRef}
        >
          <RegisterKeyDown trigger="n" handler={goToNewDocument} />
          <RegisterKeyDown trigger="t" handler={goToSearch} />
          <RegisterKeyDown trigger="/" handler={goToSearch} />
          {children}
          <React.Suspense fallback={null}>
            <CommandBar />
          </React.Suspense>
        </Layout>
      </PortalContext.Provider>
    </DocumentContextProvider>
  );
};

export default observer(AuthenticatedLayout);
