// @flow
import * as React from 'react';
import { Helmet } from 'react-helmet';
import styled from 'styled-components';
import breakpoint from 'styled-components-breakpoint';
import Analytics from './Analytics';
import GlobalStyles from '../../../shared/styles/globals';
import prefetchTags from '../../utils/prefetchTags';

export const title = 'Outline';
export const description =
  'Your team’s knowledge base - Team wiki, documentation, playbooks, onboarding & more…';
export const screenshotUrl = `${process.env.URL}/screenshot.png`;

type Props = {
  children?: React.Node,
  sessions: Object,
  loggedIn: boolean,
};

function Layout({ children, loggedIn, sessions }: Props) {
  return (
    <html lang="en">
      <head>
        <GlobalStyles />
        <Helmet>
          <title>{title}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="referrer" content="origin" />
          <meta name="slack-app-id" content="A0W3UMKBQ" />
          <meta name="description" content={description} />
          <meta name="theme-color" content="#FFFFFF" />

          <meta name="og:site_name" content={title} />
          <meta name="og:type" content="website" />
          <meta property="og:title" content={title} />
          <meta property="og:description" content={description} />
          <meta property="og:image" content={screenshotUrl} />

          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:domain" value="getoutline.com" />
          <meta name="twitter:title" value={title} />
          <meta name="twitter:description" value={description} />
          <meta name="twitter:image" content={screenshotUrl} />
          <meta name="twitter:url" value={process.env.URL} />

          <link rel="manifest" href="/manifest.json" />
          <link
            rel="shortcut icon"
            type="image/png"
            href="/favicon-16.png"
            sizes="16x16"
          />
          <link
            rel="shortcut icon"
            type="image/png"
            href="/favicon-32.png"
            sizes="32x32"
          />
          {prefetchTags}
        </Helmet>
        <Analytics />

        {'{{HEAD}}'}
        {'{{CSS}}'}
      </head>
      <Body>{children}</Body>
    </html>
  );
}

const Body = styled.body`
  padding: 0 30px;

  ${breakpoint('desktop')`
    padding: 0;
  `};
`;

export default Layout;
