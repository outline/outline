import { AnimatePresence } from "framer-motion";
import { observer, useLocalStore } from "mobx-react";
import * as React from "react";
import { Switch, Route, useLocation, matchPath } from "react-router-dom";
import { TeamPreference } from "@shared/types";
import ErrorSuspended from "~/scenes/ErrorSuspended";
import DocumentContext from "~/components/DocumentContext";
import type { DocumentContextValue } from "~/components/DocumentContext";
import Layout from "~/components/Layout";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import Sidebar from "~/components/Sidebar";
import SidebarRight from "~/components/Sidebar/Right";
import SettingsSidebar from "~/components/Sidebar/Settings";
import type { Editor as TEditor } from "~/editor";
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
import Fade from "./Fade";

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
  const can = usePolicy(ui.activeCollectionId);
  const { user, team } = auth;
  const documentContext = useLocalStore<DocumentContextValue>(() => ({
    editor: null,
    setEditor: (editor: TEditor) => {
      documentContext.editor = editor;
    },
  }));

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
    if (!activeCollectionId || !can.createDocument) {
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
  const showInsights = !!matchPath(location.pathname, {
    path: matchDocumentInsights,
  });
  const showComments =
    !showInsights &&
    !showHistory &&
    ui.activeDocumentId &&
    ui.commentsExpanded.includes(ui.activeDocumentId) &&
    team?.getPreference(TeamPreference.Commenting);

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
    <DocumentContext.Provider value={documentContext}>
      <Layout title={team?.name} sidebar={sidebar} sidebarRight={sidebarRight}>
        <RegisterKeyDown trigger="n" handler={goToNewDocument} />
        <RegisterKeyDown trigger="t" handler={goToSearch} />
        <RegisterKeyDown trigger="/" handler={goToSearch} />
        {children}
        <React.Suspense fallback={null}>
          <CommandBar />
        </React.Suspense>
      </Layout>
    </DocumentContext.Provider>
  );
};

export default observer(AuthenticatedLayout);
