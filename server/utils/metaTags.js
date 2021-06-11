// @flow
import * as React from "react";
import ReactDOMServer from "react-dom/server";
import env from "../env";

export default function metaTags(title = null) {
  return ReactDOMServer.renderToStaticMarkup([
    <meta name="description" content={env.SITE_DESCRIPTION} />,
    <title>{title || env.SITE_NAME}</title>,
    <link
      rel="search"
      type="application/opensearchdescription+xml"
      href="/opensearch.xml"
      title={env.SITE_NAME}
    />,
  ]);
}
