import { AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import * as React from "react";
import { Switch, Route, useLocation, matchPath } from "react-router-dom";
import ErrorSuspended from "~/scenes/ErrorSuspended";
import Layout from "~/components/Layout";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import Sidebar from "~/components/Sidebar";
import RightSidebar from "~/components/Sidebar/Right";
import SettingsSidebar from "~/components/Sidebar/Settings";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import {
  searchPath,
  newDocumentPath,
  settingsPath,
  matchDocumentHistory,
  matchDocumentSlug as slug,
} from "~/utils/routeHelpers";
import Fade from "./Fade";

const DocumentComments = React.lazy(
  () =>
    import(
      /* webpackChunkName: "document-comments" */
      "~/scenes/Document/components/Comments"
    )
);
const DocumentHistory = React.lazy(
  () =>
    import(
      /* webpackChunkName: "document-history" */
      "~/scenes/Document/components/History"
    )
);
const CommandBar = React.lazy(
  () =>
    import(
      /* webpackChunkName: "command-bar" */
      "~/components/CommandBar"
    )
);

const AuthenticatedLayout: React.FC = ({ children }) => {
  const { ui, auth } = useStores();
  const location = useLocation();
  const can = usePolicy(ui.activeCollectionId);
  const { user, team } = auth;

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
    if (!activeCollectionId || !can.update) {
      return;
    }
    history.push(newDocumentPath(activeCollectionId));
  };

  if (auth.isSuspended) {
    return <ErrorSuspended />;
  }

  const showSidebar = auth.authenticated && user && team;

  const sidebar = showSidebar ? (
    <Fade>
      <Switch>
        <Route path={settingsPath()} component={SettingsSidebar} />
        <Route component={Sidebar} />
      </Switch>
    </Fade>
  ) : undefined;

  const showHistory = !!matchPath(location.pathname, {
    path: matchDocumentHistory,
  });
  const showComments = !showHistory && !ui.commentsCollapsed;

  const sidebarRight = (
    <React.Suspense fallback={null}>
      <AnimatePresence key={ui.activeDocumentId}>
        {(showHistory || showComments) && (
          <Route path={`/doc/${slug}`}>
            <RightSidebar>
              {showHistory && <DocumentHistory />}
              {showComments && <DocumentComments />}
            </RightSidebar>
          </Route>
        )}
      </AnimatePresence>
    </React.Suspense>
  );

  return (
    <Layout title={team?.name} sidebar={sidebar} sidebarRight={sidebarRight}>
      <RegisterKeyDown trigger="n" handler={goToNewDocument} />
      <RegisterKeyDown trigger="t" handler={goToSearch} />
      <RegisterKeyDown trigger="/" handler={goToSearch} />
      {children}
      <CommandBar />
    </Layout>
  );
};

export default observer(AuthenticatedLayout);
