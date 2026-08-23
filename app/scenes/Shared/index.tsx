import { observer } from "mobx-react";
import { Suspense, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import styled, { ThemeProvider } from "styled-components";
import { s } from "@shared/styles";
import { isModKey } from "@shared/utils/keyboard";
import type { NavigationNode } from "@shared/types";
import Notebook from "~/models/Notebook";
import Note from "~/models/Note";
import type Share from "~/models/Share";
import Error404 from "~/scenes/Errors/Error404";
import SharedCommandBar from "~/components/CommandBar/SharedCommandBar";
import { NoteContextProvider } from "~/components/NoteContext";
import Layout from "~/components/Layout";
import Sidebar from "~/components/Sidebar/Shared";
import { TeamContext } from "~/components/TeamContext";
import Text from "~/components/Text";
import env from "~/env";
import useBuildTheme from "~/hooks/useBuildTheme";
import useCurrentUser from "~/hooks/useCurrentUser";
import useKeyDown from "~/hooks/useKeyDown";
import { usePostLoginPath } from "~/hooks/useLastVisitedPath";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { Theme } from "~/stores/UiStore";
import { client } from "~/utils/ApiClient";
import { AuthorizationError, OfflineError } from "~/utils/errors";
import isCloudHosted from "~/utils/isCloudHosted";
import { changeLanguage, detectLanguage } from "~/utils/language";
import Loading from "../Note/components/Loading";
import ErrorOffline from "../Errors/ErrorOffline";
import { Notebook as NotebookScene } from "./Notebook";
import { Note as NoteScene } from "./Note";
import DelayedMount from "~/components/DelayedMount";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { ShareContext } from "@shared/hooks/useShare";
import ClickablePadding from "~/components/ClickablePadding";
const Login = lazyWithRetry(() => import("../Login"));
// Parse the canonical origin from the SSR HTML, only needs to be done once.
const canonicalUrl = document
  .querySelector("link[rel=canonical]")
  ?.getAttribute("href");
const canonicalOrigin = canonicalUrl
  ? new URL(canonicalUrl).origin
  : window.location.origin;
type PathParams = {
  shareId?: string;
  notebookSlug?: string;
  noteSlug?: string;
};
type LocationState = {
  title?: string;
};
function useModel() {
  const { notebooks, notes, shares } = useStores();
  const {
    shareId = env.ROOT_SHARE_ID,
    notebookSlug,
    noteSlug,
  } = useParams<PathParams>();
  if (notebookSlug || noteSlug) {
    return noteSlug ? notes.get(noteSlug) : notebooks.get(notebookSlug!);
  }
  const share = shares.get(shareId);
  return share?.notebookId
    ? notebooks.get(share.notebookId)
    : share?.noteId
      ? notes.get(share.noteId)
      : undefined;
}
function useActivePage(share?: Share) {
  const { notebookSlug, noteSlug } = useParams<PathParams>();
  if (!share) {
    return;
  }
  const findInTree = (
    node: NavigationNode,
    slugToFind: string
  ): string | undefined => {
    if (node.url.endsWith(slugToFind)) {
      return node.id;
    }
    if (node.children) {
      for (const child of node.children) {
        const foundId = findInTree(child, slugToFind);
        if (foundId) {
          return foundId;
        }
      }
    }
    return;
  };
  if (!share.tree) {
    return share.notebookId
      ? { type: "collection", id: share.notebookId }
      : { type: "document", id: share.noteId };
  } else if (noteSlug) {
    return { type: "document", id: findInTree(share.tree, noteSlug) };
  } else if (notebookSlug) {
    return { type: "collection", id: findInTree(share.tree, notebookSlug) };
  } else {
    if (share.notebookId) {
      return { type: "collection", id: share.notebookId };
    } else {
      return { type: "document", id: share.noteId };
    }
  }
}
function SharedScene() {
  const { t, i18n } = useTranslation();
  const { shareId = env.ROOT_SHARE_ID, noteSlug } = useParams<PathParams>();
  const location = useLocation<LocationState>();
  const { notes, shares, ui } = useStores();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const [, setPostLoginPath] = usePostLoginPath();
  const model = useModel();
  const share = shares.get(shareId);
  const activePage = useActivePage(share);
  const team = share?.team;
  const theme = useBuildTheme(team?.customTheme);
  const pageTitle =
    model instanceof Notebook
      ? model.name
      : model instanceof Note
        ? model.title
        : undefined;
  const { request, error, loading, loaded } = useRequest(
    useCallback(
      () =>
        Promise.all([
          shares.fetch(shareId),
          noteSlug ? notes.fetch(noteSlug) : undefined,
        ]),
      [shares, notes, shareId, noteSlug]
    )
  );
  useKeyDown(
    useCallback(
      (ev: KeyboardEvent) => isModKey(ev) && ev.shiftKey && ev.code === "KeyL",
      []
    ),
    useCallback(() => {
      if (!ui.themeOverride) {
        ui.setTheme(ui.resolvedTheme === "light" ? Theme.Dark : Theme.Light);
      }
    }, [ui])
  );
  useEffect(() => {
    if (!user) {
      void changeLanguage(detectLanguage(), i18n);
    }
  }, [user, i18n]);
  useEffect(() => {
    client.setShareId(shareId);
    return () => client.setShareId(undefined);
  }, [shareId]);
  useEffect(() => {
    if (!activePage || !activePage.id) {
      return;
    }
    if (activePage.type === "document") {
      ui.setActiveNote(activePage.id);
    } else {
      ui.setActiveNotebook(activePage.id);
    }
    return () => {
      if (activePage.type === "document") {
        ui.clearActiveNote();
      } else {
        ui.setActiveNotebook(undefined);
      }
    };
  }, [ui, activePage]);
  useEffect(() => {
    void request();
  }, [request]);
  if (loading && !loaded) {
    return <Loading location={location} />;
  }
  if (error) {
    if (error instanceof OfflineError) {
      return <ErrorOffline />;
    }
    if (error instanceof AuthorizationError) {
      setPostLoginPath(location.pathname);
      return (
        <Suspense fallback={null}>
          <Login>
            {(config) =>
              config?.name && isCloudHosted ? (
                <Content>
                  {t(
                    "{{ teamName }} is using {{ appName }} to share documents, please login to continue.",
                    {
                      teamName: config.name,
                      appName: env.APP_NAME,
                    }
                  )}
                </Content>
              ) : null
            }
          </Login>
        </Suspense>
      );
    }
    return <Error404 />;
  }
  if (!share) {
    return (
      <DelayedMount>
        <Error404 />
      </DelayedMount>
    );
  }
  const hasSidebar = !!share.tree?.children.length;
  return (
    <ShareContext.Provider
      value={{
        shareId,
        sharedTree: share.tree,
        allowSubscriptions: share.allowSubscriptions,
        showLastUpdated: share.showLastUpdated,
      }}
    >
      <Helmet>
        <link
          rel="canonical"
          href={canonicalOrigin + location.pathname.replace(/\/$/, "")}
        />
      </Helmet>
      <TeamContext.Provider value={team}>
        <ThemeProvider theme={theme}>
          <NoteContextProvider>
            <Layout
              title={pageTitle}
              sidebar={hasSidebar ? <Sidebar share={share} /> : null}
              sidebarCanCollapse={false}
            >
              {model instanceof Note ? (
                <NoteScene note={model} />
              ) : model instanceof Notebook ? (
                <NotebookScene notebook={model} />
              ) : null}
            </Layout>
            <SharedCommandBar />
            <ClickablePadding minHeight="20vh" />
          </NoteContextProvider>
        </ThemeProvider>
      </TeamContext.Provider>
    </ShareContext.Provider>
  );
}
const Content = styled(Text)`
  color: ${s("textSecondary")};
  text-align: center;
  margin-top: -8px;
`;
export default observer(SharedScene);
