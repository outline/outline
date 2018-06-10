// @flow
import * as React from 'react';
import ReactDOMServer from 'react-dom/server';
import { Helmet } from 'react-helmet';
import {
  ServerStyleSheet,
  StyleSheetManager,
  ThemeProvider,
} from 'styled-components';
import Layout from '../pages/components/Layout';
import theme from '../../shared/styles/theme';

const sheet = new ServerStyleSheet();

export default function renderpage(ctx: Object, children: React.Node) {
  const html = ReactDOMServer.renderToString(
    <StyleSheetManager sheet={sheet.instance}>
      <ThemeProvider theme={theme}>
        <Layout>{children}</Layout>
      </ThemeProvider>
    </StyleSheetManager>
  );

  // helmet returns an object of meta tags with toString methods, urgh.
  const helmet = Helmet.renderStatic();
  let head = '';
  // $FlowFixMe
  Object.keys(helmet).forEach(key => (head += helmet[key].toString()));

  ctx.body = html
    .replace('{{CSS}}', sheet.getStyleTags())
    .replace('{{HEAD}}', head);
}
