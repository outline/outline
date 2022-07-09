import { Location } from "history";
import { observer } from "mobx-react";
import * as React from "react";
import { Helmet } from "react-helmet";
import { RouteComponentProps, useLocation } from "react-router-dom";
import { useTheme } from "styled-components";
import { setCookie } from "tiny-cookie";
import DocumentModel from "~/models/Document";
import Error404 from "~/scenes/Error404";
import ErrorOffline from "~/scenes/ErrorOffline";
import Layout from "~/components/Layout";
import Sidebar from "~/components/Sidebar/Shared";
import useStores from "~/hooks/useStores";
import { NavigationNode } from "~/types";
import { AuthorizationError, OfflineError } from "~/utils/errors";
import Login from "../Login";
import Document from "./components/Document";
import Loading from "./components/Loading";

const EMPTY_OBJECT = {};

type Response = {
  document: DocumentModel;
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
  const { ui } = useStores();
  const theme = useTheme();
  const location = useLocation();
  const [response, setResponse] = React.useState<Response>();
  const [error, setError] = React.useState<Error | null | undefined>();
  const { documents } = useStores();
  const { shareId, documentSlug } = props.match.params;
  const documentId = useDocumentId(documentSlug, response);

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
      return <Login />;
    } else {
      return <Error404 />;
    }
  }

  if (!response) {
    return <Loading location={props.location} />;
  }

  const sidebar = response.sharedTree ? (
    <Sidebar rootNode={response.sharedTree} shareId={shareId} />
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

export default observer(SharedDocumentScene);
