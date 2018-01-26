// @flow
import React from 'react';
import { Helmet } from 'react-helmet';
import { TopNavigation, BottomNavigation } from './Navigation';
import Analytics from '../../../shared/components/Analytics';
import globalStyles from '../../../shared/styles/globals';
import { color } from '../../../shared/styles/constants';
import prefetchTags from '../../utils/prefetchTags';

export const title = 'Outline';
export const description =
  'Your team’s knowledge base - Team wiki, documentation, playbooks, onboarding & more…';
export const screenshotUrl = `${process.env.URL}/screenshot.png`;

type Props = {
  children?: React$Element<*>,
};

export default function Layout({ children }: Props) {
  globalStyles();

  return (
    <html lang="en">
      <head>
        <Helmet>
          <title>{title}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="referrer" content="origin" />
          <meta name="slack-app-id" content="A0W3UMKBQ" />
          <meta name="description" content={description} />

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

          <meta name="theme-color" content={color.primary} />
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
      <body>
        <TopNavigation />
        {children}
        <BottomNavigation />
      </body>
    </html>
  );
}
