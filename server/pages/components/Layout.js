// @flow
import React from 'react';
import { Helmet } from 'react-helmet';
import Navigation from './Navigation';
import Analytics from '../../../shared/components/Analytics';
import globalStyles from '../../../shared/styles/globals';
import { color } from '../../../shared/styles/constants';

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
          <meta name="description" content="Your team’s knowledge base" />
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
          <link
            rel="dns-prefetch"
            href={process.env.AWS_S3_UPLOAD_BUCKET_URL}
          />
        </Helmet>
        <Analytics />

        {'{{HEAD}}'}
        {'{{CSS}}'}
      </head>
      <body>
        <Navigation />
        {children}
      </body>
    </html>
  );
}
