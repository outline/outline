// @flow
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { Helmet } from 'react-helmet';
import { ServerStyleSheet, StyleSheetManager } from 'styled-components';
import Layout from '../pages/components/Layout';

const sheet = new ServerStyleSheet();

export default function renderpage(ctx: Object, children: React$Element<*>) {
  const html = ReactDOMServer.renderToString(
    <StyleSheetManager sheet={sheet.instance}>
      <Layout>
        {children}
      </Layout>
    </StyleSheetManager>
  );

  // helmet returns an object of meta tags with toString methods, urgh.
  const helmet = Helmet.renderStatic();
  let head = '';
  Object.keys(helmet).forEach(key => (head += helmet[key].toString()));

  ctx.body = html
    .replace('{{CSS}}', sheet.getStyleTags())
    .replace('{{HEAD}}', head);
}
