import * as React from "react";
import { StaticContext } from "react-router";
import { RouteComponentProps } from "react-router-dom";
import useLastVisitedPath from "~/hooks/useLastVisitedPath";
import useStores from "~/hooks/useStores";
import DataLoader from "./components/DataLoader";
import Document from "./components/Document";

type Params = {
  documentSlug: string;
  revisionId?: string;
  shareId?: string;
};

type LocationState = {
  title?: string;
  restore?: boolean;
  revisionId?: string;
};

type Props = RouteComponentProps<Params, StaticContext, LocationState>;

export default function DocumentScene(props: Props) {
  const { ui } = useStores();
  const { documentSlug, revisionId } = props.match.params;
  const currentPath = props.location.pathname;
  const [, setLastVisitedPath] = useLastVisitedPath();

  React.useEffect(() => {
    setLastVisitedPath(currentPath);
  }, [currentPath, setLastVisitedPath]);

  React.useEffect(() => {
    return () => ui.clearActiveDocument();
  }, [ui]);

  // the urlId portion of the url does not include the slugified title
  // we only want to force a re-mount of the document component when the
  // document changes, not when the title does so only this portion is used
  // for the key.
  const urlParts = documentSlug ? documentSlug.split("-") : [];
  const urlId = urlParts.length ? urlParts[urlParts.length - 1] : undefined;
  const key = [urlId, revisionId].join("/");

  return (
    <DataLoader
      key={key}
      match={props.match}
      history={props.history}
      location={props.location}
    >
      {(rest) => <Document {...rest} />}
    </DataLoader>
  );
}
