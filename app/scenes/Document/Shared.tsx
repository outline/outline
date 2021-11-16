import * as React from "react";
// @ts-expect-error ts-migrate(2724) FIXME: '"react-router-dom"' has no exported member named ... Remove this comment to see the full error message
import { Match } from "react-router-dom";
import "react-router-dom";
import { useTheme } from "styled-components";
import Error404 from "scenes/Error404";
import ErrorOffline from "scenes/ErrorOffline";
import useStores from "../../hooks/useStores";
import Document from "./components/Document";
import Loading from "./components/Loading";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'types' or its corresponding ty... Remove this comment to see the full error message
import { LocationWithState } from "types";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/errors' or its correspon... Remove this comment to see the full error message
import { OfflineError } from "utils/errors";
import "types";

const EMPTY_OBJECT = {};
type Props = {
  match: Match;
  location: LocationWithState;
};

export default function SharedDocumentScene(props: Props) {
  const theme = useTheme();
  const [response, setResponse] = React.useState();
  const [error, setError] = React.useState<Error | null | undefined>();
  const { documents } = useStores();
  const { shareId, documentSlug } = props.match.params;
  // ensure the wider page color always matches the theme
  React.useEffect(() => {
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'background' does not exist on type 'Defa... Remove this comment to see the full error message
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
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ abilities: {}; document: any; sharedTree: ... Remove this comment to see the full error message
      abilities={EMPTY_OBJECT}
      // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
      document={response.document}
      // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
      sharedTree={response.sharedTree}
      location={props.location}
      shareId={shareId}
      readOnly
    />
  );
}
