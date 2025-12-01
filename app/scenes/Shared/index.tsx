import { observer } from "mobx-react";
import { Suspense, useCallback, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";
import styled, { ThemeProvider } from "styled-components";
import { s } from "@shared/styles";
import { NavigationNode } from "@shared/types";
import Collection from "~/models/Collection";
import Document from "~/models/Document";
import Share from "~/models/Share";
import Error404 from "~/scenes/Errors/Error404";
import ClickablePadding from "~/components/ClickablePadding";
import { DocumentContextProvider } from "~/components/DocumentContext";
import Layout from "~/components/Layout";
import Sidebar from "~/components/Sidebar/Shared";
import { TeamContext } from "~/components/TeamContext";
import Text from "~/components/Text";
import env from "~/env";
import useBuildTheme from "~/hooks/useBuildTheme";
import useCurrentUser from "~/hooks/useCurrentUser";
import { usePostLoginPath } from "~/hooks/useLastVisitedPath";
import useRequest from "~/hooks/useRequest";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { AuthorizationError, OfflineError } from "~/utils/errors";
import isCloudHosted from "~/utils/isCloudHosted";
import { changeLanguage, detectLanguage } from "~/utils/language";
import Loading from "../Document/components/Loading";
import ErrorOffline from "../Errors/ErrorOffline";
import { Collection as CollectionScene } from "./Collection";
import { Document as DocumentScene } from "./Document";
import DelayedMount from "~/components/DelayedMount";
import lazyWithRetry from "~/utils/lazyWithRetry";
import { ShareContext } from "@shared/hooks/useShare";

const Login = lazyWithRetry(() => import("../Login"));

// Parse the canonical origin from the SSR HTML, only needs to be done once.
const canonicalUrl = document
  .querySelector("link[rel=canonical]")
  ?.getAttribute("href");
const canonicalOrigin = canonicalUrl
  ? new URL(canonicalUrl).origin
  : window.location.origin;

type PathParams = {
  shareId: string;
  collectionSlug?: string;
  documentSlug?: string;
};

type LocationState = {
  title?: string;
};

function useModel() {
  const { collections, documents, shares } = useStores();
  const {
    shareId = env.ROOT_SHARE_ID,
    collectionSlug,
    documentSlug,
  } = useParams<PathParams>();

  if (collectionSlug || documentSlug) {
    return documentSlug
      ? documents.get(documentSlug)
      : collections.get(collectionSlug!);
  }

  const share = shares.get(shareId);
  return share?.collectionId
    ? collections.get(share.collectionId)
    : share?.documentId
      ? documents.get(share.documentId)
      : undefined;
}

function useActivePage(share?: Share) {
  const { collectionSlug, documentSlug } = useParams<PathParams>();

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
    return share.collectionId
      ? { type: "collection", id: share.collectionId }
      : { type: "document", id: share.documentId };
  } else if (documentSlug) {
    return { type: "document", id: findInTree(share.tree, documentSlug) };
  } else if (collectionSlug) {
    return { type: "collection", id: findInTree(share.tree, collectionSlug) };
  } else {
    if (share.collectionId) {
      return { type: "collection", id: share.collectionId };
    } else {
      return { type: "document", id: share.documentId };
    }
  }
}

function SharedScene() {
  const { t, i18n } = useTranslation();
  const { shareId = env.ROOT_SHARE_ID, documentSlug } = useParams<PathParams>();
  const location = useLocation<LocationState>();
  const { documents, shares, ui } = useStores();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const [, setPostLoginPath] = usePostLoginPath();

  const model = useModel();
  const share = shares.get(shareId);
  const activePage = useActivePage(share);

  const team = share?.team;
  const theme = useBuildTheme(team?.customTheme);

  const pageTitle =
    model instanceof Collection
      ? model.name
      : model instanceof Document
        ? model.title
        : undefined;

  const { request, error, loading, loaded } = useRequest(
    useCallback(
      () =>
        Promise.all([
          shares.fetch(shareId),
          documentSlug ? documents.fetch(documentSlug) : undefined,
        ]),
      [shares, documents, shareId, documentSlug]
    )
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
      ui.setActiveDocument(activePage.id);
    } else {
      ui.setActiveCollection(activePage.id);
    }

    return () => {
      if (activePage.type === "document") {
        ui.clearActiveDocument();
      } else {
        ui.setActiveCollection(undefined);
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
          <DocumentContextProvider>
            <Layout
              title={pageTitle}
              sidebar={hasSidebar ? <Sidebar share={share} /> : null}
            >
              {model instanceof Document ? (
                <DocumentScene document={model} />
              ) : model instanceof Collection ? (
                <CollectionScene collection={model} />
              ) : null}
            </Layout>
            <ClickablePadding minHeight="20vh" />
          </DocumentContextProvider>
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
