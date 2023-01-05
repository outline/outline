import { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import { RouteComponentProps, useLocation, Redirect } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import { setCookie } from "tiny-cookie";
import DocumentModel from "~/models/Document";
import Team from "~/models/Team";
import Error404 from "~/scenes/Error404";
import ErrorOffline from "~/scenes/ErrorOffline";
import Layout from "~/components/Layout";
import Sidebar from "~/components/Sidebar/Shared";
import Text from "~/components/Text";
import env from "~/env";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { NavigationNode } from "~/types";
import { AuthorizationError, OfflineError } from "~/utils/errors";
import isCloudHosted from "~/utils/isCloudHosted";
import { changeLanguage, detectLanguage } from "~/utils/language";
import Login from "../Login";
import Document from "./components/Document";
import Loading from "./components/Loading";

const EMPTY_OBJECT = {};

type Response = {
  document: DocumentModel;
  team?: Team;
  sharedTree?: NavigationNode | undefined;
};

type Props = RouteComponentProps<{
  shareId: string;
  documentSlug: string;
}> & {
  location: Location<{ title?: string }>;
};

// Parse the canonical origin from the SSR HTML, only needs to be done once.
const canonicalUrl = document
  .querySelector("link[rel=canonical]")
  ?.getAttribute("href");
const canonicalOrigin = canonicalUrl
  ? new URL(canonicalUrl).origin
  : window.location.origin;

/**
 * Find the document UUID from the slug given the sharedTree
 *
 * @param documentSlug The slug from the url
 * @param response The response payload from the server
 * @returns The document UUID, if found.
 */
function useDocumentId(documentSlug: string, response?: Response) {
  let documentId;

  function findInTree(node: NavigationNode) {
    if (node.url.endsWith(documentSlug)) {
      documentId = node.id;
      return true;
    }
    if (node.children) {
      for (const child of node.children) {
        if (findInTree(child)) {
          return true;
        }
      }
    }
    return false;
  }

  if (response?.sharedTree) {
    findInTree(response.sharedTree);
  }

  return documentId;
}

function SharedDocumentScene(props: Props) {
  const { ui, auth } = useStores();
  const theme = useTheme();
  const location = useLocation();
  const searchParams = React.useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const { t, i18n } = useTranslation();
  const [response, setResponse] = React.useState<Response>();
  const [error, setError] = React.useState<Error | null | undefined>();
  const { documents } = useStores();
  const { shareId, documentSlug } = props.match.params;
  const documentId = useDocumentId(documentSlug, response);
  const can = usePolicy(response?.document.id ?? "");

  React.useEffect(() => {
    if (!auth.user) {
      changeLanguage(detectLanguage(), i18n);
    }
  }, [auth, i18n]);

  // ensure the wider page color always matches the theme
  React.useEffect(() => {
    window.document.body.style.background = theme.background;
  }, [theme]);

  React.useEffect(() => {
    if (documentId) {
      ui.setActiveDocument(documentId);
    }
  }, [ui, documentId]);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const response = await documents.fetchWithSharedTree(documentSlug, {
          shareId,
        });
        setResponse(response);
      } catch (err) {
        setError(err);
      }
    }
    fetchData();
  }, [documents, documentSlug, shareId, ui]);

  if (error) {
    if (error instanceof OfflineError) {
      return <ErrorOffline />;
    } else if (error instanceof AuthorizationError) {
      setCookie("postLoginRedirectPath", props.location.pathname);
      return (
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
      );
    } else {
      return <Error404 />;
    }
  }

  if (!response) {
    return <Loading location={props.location} />;
  }

  if (response && searchParams.get("edit") === "true" && can.update) {
    return <Redirect to={response.document.url} />;
  }

  const sidebar = response.sharedTree?.children.length ? (
    <Sidebar
      rootNode={response.sharedTree}
      team={response.team}
      shareId={shareId}
    />
  ) : undefined;

  return (
    <>
      <Helmet>
        <link
          rel="canonical"
          href={canonicalOrigin + location.pathname.replace(/\/$/, "")}
        />
      </Helmet>
      <Layout title={response.document.title} sidebar={sidebar}>
        <Document
          abilities={EMPTY_OBJECT}
          document={response.document}
          sharedTree={response.sharedTree}
          shareId={shareId}
          readOnly
        />
      </Layout>
    </>
  );
}

const Content = styled(Text)`
  color: ${(props) => props.theme.textSecondary};
  text-align: center;
  margin-top: -8px;
`;

export default observer(SharedDocumentScene);
