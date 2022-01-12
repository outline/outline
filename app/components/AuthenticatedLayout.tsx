import { observable } from "mobx";
import { observer } from "mobx-react";
import { MenuIcon } from "outline-icons";
import * as React from "react";
import { Helmet } from "react-helmet";
import { withTranslation, WithTranslation } from "react-i18next";
import { Switch, Route } from "react-router-dom";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import RootStore from "~/stores/RootStore";
import ErrorSuspended from "~/scenes/ErrorSuspended";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Layout from "~/components/Layout";
import { LoadingIndicatorBar } from "~/components/LoadingIndicator";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import Sidebar from "~/components/Sidebar";
import SettingsSidebar from "~/components/Sidebar/Settings";
import SkipNavContent from "~/components/SkipNavContent";
import SkipNavLink from "~/components/SkipNavLink";
import history from "~/utils/history";
import { isModKey } from "~/utils/keyboard";
import {
  searchUrl,
  matchDocumentSlug as slug,
  newDocumentPath,
  settingsPath,
} from "~/utils/routeHelpers";
import withStores from "./withStores";

const DocumentHistory = React.lazy(
  () =>
    import(
      /* webpackChunkName: "document-history" */
      "~/components/DocumentHistory"
    )
);
const CommandBar = React.lazy(
  () =>
    import(
      /* webpackChunkName: "command-bar" */
      "~/components/CommandBar"
    )
);

type Props = WithTranslation &
  RootStore & {
    children?: React.ReactNode;
  };

@observer
class AuthenticatedLayout extends React.Component<Props> {
  scrollable: HTMLDivElement | null | undefined;

  @observable
  keyboardShortcutsOpen = false;

  goToSearch = (ev: KeyboardEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    history.push(searchUrl());
  };

  goToNewDocument = () => {
    const { activeCollectionId } = this.props.ui;
    if (!activeCollectionId) return;
    const can = this.props.policies.abilities(activeCollectionId);
    if (!can.update) return;
    history.push(newDocumentPath(activeCollectionId));
  };

  render() {
    const { auth } = this.props;
    const { user, team } = auth;
    const showSidebar = auth.authenticated && user && team;
    if (auth.isSuspended) return <ErrorSuspended />;

    const sidebar = showSidebar ? (
      <Switch>
        <Route path={settingsPath()} component={SettingsSidebar} />
        <Route component={Sidebar} />
      </Switch>
    ) : undefined;

    const rightRail = (
      <React.Suspense fallback={null}>
        <Switch>
          <Route
            path={`/doc/${slug}/history/:revisionId?`}
            component={DocumentHistory}
          />
        </Switch>
      </React.Suspense>
    );

    return (
      <Layout title={team?.name} sidebar={sidebar} rightRail={rightRail}>
        <RegisterKeyDown trigger="n" handler={this.goToNewDocument} />
        <RegisterKeyDown trigger="t" handler={this.goToSearch} />
        <RegisterKeyDown trigger="/" handler={this.goToSearch} />
        {this.props.children}
      </Layout>
    );
  }
}

export default withTranslation()(withStores(AuthenticatedLayout));
