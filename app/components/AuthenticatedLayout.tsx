import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import * as React from "react";
import {
  Switch,
  Route,
  useLocation,
  matchPath,
  Redirect,
} from "react-router-dom";
import { TeamPreference } from "@shared/types";
import ErrorSuspended from "~/scenes/Errors/ErrorSuspended";
import Layout from "~/components/Layout";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import Sidebar from "~/components/Sidebar";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import { usePostLoginPath } from "~/hooks/useLastVisitedPath";
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
  documentPath,
} from "~/utils/routeHelpers";
import { DocumentContextProvider } from "./DocumentContext";
import Fade from "./Fade";
import NotificationBadge from "./NotificationBadge";
import { PortalContext } from "./Portal";
import CommandBar from "./CommandBar";

const DocumentComments = lazyWithRetry(
  () => import("~/scenes/Document/components/Comments/Comments")
);
const DocumentHistory = lazyWithRetry(
  () => import("~/scenes/Document/components/History")
);
const SettingsSidebar = lazyWithRetry(
  () => import("~/components/Sidebar/Settings")
);

type Props = {
  children?: React.ReactNode;
};

type ActiveSidebar = "history" | "comments" | null;

const AuthenticatedLayout: React.FC = ({ children }: Props) => {
  const { ui, auth, documents } = useStores();
  const location = useLocation();
  const layoutRef = React.useRef<HTMLDivElement>(null);
  const can = usePolicy(ui.activeDocumentId);
  const canCollection = usePolicy(ui.activeCollectionId);
  const team = useCurrentTeam();
  const [spendPostLoginPath] = usePostLoginPath();
  const [activeSidebar, setActiveSidebar] = React.useState<ActiveSidebar>(null);

  // Determine which sidebar should be active based on route and state
  React.useEffect(() => {
    const isHistoryRoute = !!matchPath(location.pathname, {
      path: matchDocumentHistory,
    });
    
    const shouldShowHistory = isHistoryRoute && can.listRevisions;
    const shouldShowComments =
      ui.commentsExpanded &&
      can.comment &&
      ui.activeDocumentId &&
      team.getPreference(TeamPreference.Commenting);

    // If both want to be shown, comments takes precedence (most recent user action)
    // This allows toggling comments on while history is open
    if (shouldShowComments) {
      setActiveSidebar("comments");
      // If on history route, navigate away to show comments
      if (isHistoryRoute && ui.activeDocumentId) {
        const document = documents.get(ui.activeDocumentId);
        if (document) {
          history.push(documentPath(document));
        }
      }
    } else if (shouldShowHistory) {
      setActiveSidebar("history");
    } else {
      setActiveSidebar(null);
    }
  }, [
    location.pathname,
    ui.commentsExpanded,
    can.comment,
    can.listRevisions,
    ui.activeDocumentId,
    team,
    documents,
  ]);

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

  const postLoginPath = spendPostLoginPath();
  if (postLoginPath) {
    return <Redirect to={postLoginPath} />;
  }

  const sidebar = (
    <Fade>
      <Switch>
        <Route path={settingsPath()} component={SettingsSidebar} />
        <Route component={Sidebar} />
      </Switch>
    </Fade>
  );

  const showHistory = activeSidebar === "history";
  const showComments = activeSidebar === "comments";

  const sidebarRight = (
    <AnimatePresence
      initial={false}
      key={ui.activeDocumentId ? "active" : "inactive"}
    >
      {(showHistory || showComments) && (
        <Route path={`/doc/${slug}`}>
          <React.Suspense fallback={null}>
            {showHistory && <DocumentHistory />}
            {showComments && <DocumentComments />}
          </React.Suspense>
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
          <CommandBar />
          <NotificationBadge />
        </Layout>
      </PortalContext.Provider>
    </DocumentContextProvider>
  );
};

export default observer(AuthenticatedLayout);
