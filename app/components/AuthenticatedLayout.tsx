import { observer } from "mobx-react";
import * as React from "react";
import { Switch, Route } from "react-router-dom";
import ErrorSuspended from "~/scenes/ErrorSuspended";
import Layout from "~/components/Layout";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import Sidebar from "~/components/Sidebar";
import SettingsSidebar from "~/components/Sidebar/Settings";
import useStores from "~/hooks/useStores";
import history from "~/utils/history";
import {
  searchPath,
  matchDocumentSlug as slug,
  newDocumentPath,
  settingsPath,
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

type Props = {
  children?: React.ReactNode;
};

function AuthenticatedLayout(props: Props) {
  const { auth, ui, policies } = useStores();
  const { user, team } = auth;
  const can = policies.abilities(ui.activeCollectionId || "");
  const showSidebar = auth.authenticated && user && team;

  const goToSearch = React.useCallback((ev: KeyboardEvent) => {
    if (!ev.metaKey && !ev.ctrlKey) {
      ev.preventDefault();
      ev.stopPropagation();
      history.push(searchPath());
    }
  }, []);

  const goToNewDocument = React.useCallback(() => {
    if (!ui.activeCollectionId) {
      return;
    }
    if (can.update) {
      history.push(newDocumentPath(ui.activeCollectionId));
    }
  }, [can.update, ui.activeCollectionId]);

  if (auth.isSuspended) {
    return <ErrorSuspended />;
  }

  const sidebar = showSidebar ? (
    <Fade>
      <Switch>
        <Route path={settingsPath()} component={SettingsSidebar} />
        <Route component={Sidebar} />
      </Switch>
    </Fade>
  ) : undefined;

  const rightSidebar = (
    <React.Suspense fallback={null}>
      <Switch>
        <Route
          path={`/doc/${slug}/history/:revisionId?`}
          component={DocumentHistory}
        />
        {ui.commentsCollapsed ? null : (
          <Route path={`/doc/${slug}`} component={DocumentComments} />
        )}
      </Switch>
    </React.Suspense>
  );

  return (
    <Layout title={team?.name} sidebar={sidebar} rightSidebar={rightSidebar}>
      <RegisterKeyDown trigger="n" handler={goToNewDocument} />
      <RegisterKeyDown trigger="t" handler={goToSearch} />
      <RegisterKeyDown trigger="/" handler={goToSearch} />
      {props.children}
      <CommandBar />
    </Layout>
  );
}

export default observer(AuthenticatedLayout);
