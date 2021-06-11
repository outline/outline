// @flow
import * as React from "react";
import ReactDOMServer from "react-dom/server";
import env from "../env";

const metaTags = [];

metaTags.push(<meta name="description" content={env.SITE_DESCRIPTION} />);

metaTags.push(<title>{env.SITE_NAME}</title>);

metaTags.push(
  <link
    rel="search"
    type="application/opensearchdescription+xml"
    href="/opensearch.xml"
    title={env.SITE_NAME}
  />
);

export default ReactDOMServer.renderToString(metaTags);
