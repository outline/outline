// @flow
import * as React from "react";
import { type Match } from "react-router-dom";
import useStores from "../../hooks/useStores";
import DataLoader from "./components/DataLoader";

type Props = {|
  match: Match,
|};

export default function KeyedDocument(props: Props) {
  const { ui } = useStores();

  React.useEffect(() => {
    return () => ui.clearActiveDocument();
  }, [ui]);

  const { documentSlug, revisionId } = props.match.params;

  // the urlId portion of the url does not include the slugified title
  // we only want to force a re-mount of the document component when the
  // document changes, not when the title does so only this portion is used
  // for the key.
  const urlParts = documentSlug ? documentSlug.split("-") : [];
  const urlId = urlParts.length ? urlParts[urlParts.length - 1] : undefined;

  return <DataLoader key={[urlId, revisionId].join("/")} {...props} />;
}
