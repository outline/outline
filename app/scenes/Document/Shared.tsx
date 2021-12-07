import { Location } from "history";
import * as React from "react";
import { RouteComponentProps } from "react-router-dom";
import { useTheme } from "styled-components";
import DocumentModel from "~/models/Document";
import Error404 from "~/scenes/Error404";
import ErrorOffline from "~/scenes/ErrorOffline";
import useStores from "~/hooks/useStores";
import { NavigationNode } from "~/types";
import { OfflineError } from "~/utils/errors";
import Document from "./components/Document";
import Loading from "./components/Loading";

const EMPTY_OBJECT = {};

type Props = RouteComponentProps<{
  shareId: string;
  documentSlug: string;
}> & {
  location: Location<{ title?: string }>;
};

export default function SharedDocumentScene(props: Props) {
  const theme = useTheme();
  const [response, setResponse] = React.useState<{
    document: DocumentModel;
    sharedTree?: NavigationNode | undefined;
  }>();
  const [error, setError] = React.useState<Error | null | undefined>();
  const { documents } = useStores();
  const { shareId, documentSlug } = props.match.params;

  // ensure the wider page color always matches the theme
  React.useEffect(() => {
    window.document.body.style.background = theme.background;
  }, [theme]);

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
  }, [documents, documentSlug, shareId]);

  if (error) {
    return error instanceof OfflineError ? <ErrorOffline /> : <Error404 />;
  }

  if (!response) {
    return <Loading location={props.location} />;
  }

  return (
    <Document
      abilities={EMPTY_OBJECT}
      document={response.document}
      sharedTree={response.sharedTree}
      shareId={shareId}
      readOnly
    />
  );
}
