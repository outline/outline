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
import { light } from '../../shared/styles/theme';

const sheet = new ServerStyleSheet();

export default function renderpage(ctx: Object, children: React.Node) {
  let sessions = {};
  try {
    sessions = JSON.parse(
      decodeURIComponent(ctx.cookies.get('sessions') || '') || '{}'
    );
  } catch (err) {
    console.error(`Sessions cookie could not be parsed: ${err}`);
  }

  const loggedIn = !!(
    ctx.cookies.get('accessToken') || Object.keys(sessions).length
  );

  const html = ReactDOMServer.renderToString(
    <StyleSheetManager sheet={sheet.instance}>
      <ThemeProvider theme={light}>
        <Layout sessions={sessions} loggedIn={loggedIn}>
          {children}
        </Layout>
      </ThemeProvider>
    </StyleSheetManager>
  );

  // helmet returns an object of meta tags with toString methods, urgh.
  const helmet = Helmet.renderStatic();
  let head = '';
  // $FlowFixMe
  Object.keys(helmet).forEach(key => (head += helmet[key].toString()));

  ctx.body = `<!DOCTYPE html>\n${html}`
    .replace('{{CSS}}', sheet.getStyleTags())
    .replace('{{HEAD}}', head);
}
