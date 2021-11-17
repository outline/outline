import { Location } from "history";
import * as React from "react";
import { RouteComponentProps } from "react-router-dom";
import { useTheme } from "styled-components";
import DocumentModel from "models/Document";
import Error404 from "scenes/Error404";
import ErrorOffline from "scenes/ErrorOffline";
import useStores from "../../hooks/useStores";
import { NavigationNode } from "../../types";
import Document from "./components/Document";
import Loading from "./components/Loading";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/errors' or its correspon... Remove this comment to see the full error message
import { OfflineError } from "utils/errors";

const EMPTY_OBJECT = {};

type Props = RouteComponentProps<{ shareId: string; documentSlug: string }> & {
  location: Location;
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
        const response = await documents.fetch(documentSlug, {
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
      location={props.location}
      shareId={shareId}
      readOnly
    />
  );
}
