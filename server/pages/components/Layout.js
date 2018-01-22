// @flow
import React from 'react';
import { Helmet } from 'react-helmet';
import { TopNavigation, BottomNavigation } from './Navigation';
import Analytics from '../../../shared/components/Analytics';
import globalStyles from '../../../shared/styles/globals';
import { color } from '../../../shared/styles/constants';
import prefetchTags from '../../utils/prefetchTags';

type Props = {
  children?: React$Element<*>,
};

export default function Layout({ children }: Props) {
  globalStyles();

  return (
    <html lang="en">
      <head>
        <Helmet>
          <title>Outline</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="referrer" content="origin" />
          <meta
            name="description"
            content="Your team’s knowledge base - Team wiki, documentation, playbooks, onboarding & more…"
          />
          <meta name="og:site_name" content="Outline" />
          <meta name="og:type" content="website" />
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
