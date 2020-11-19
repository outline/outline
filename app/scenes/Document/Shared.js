// @flow
import * as React from "react";
import { type Match } from "react-router-dom";
import Error404 from "scenes/Error404";
import ErrorOffline from "scenes/ErrorOffline";
import useStores from "../../hooks/useStores";
import Document from "./components/Document";
import Loading from "./components/Loading";
import { type LocationWithState } from "types";
import { OfflineError } from "utils/errors";

type Props = {|
  match: Match,
  location: LocationWithState,
|};

export default function SharedEditor(props: Props) {
  const [document, setDocument] = React.useState();
  const [error, setError] = React.useState<?Error>();
  const { documents } = useStores();
  const { shareId, documentSlug } = props.match.params;

  React.useEffect(() => {
    async function fetchData() {
      try {
        const doc = await documents.fetch(documentSlug, {
          shareId,
        });
        setDocument(doc);
      } catch (err) {
        setError(err);
      }
    }
    fetchData();
  }, [documents, documentSlug, shareId]);

  if (error) {
    return error instanceof OfflineError ? <ErrorOffline /> : <Error404 />;
  }

  if (!document) {
    return <Loading location={props.location} />;
  }

  return <Document document={document} location={props.location} readOnly />;
}
