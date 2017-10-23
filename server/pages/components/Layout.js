// @flow
import React from 'react';
import { Helmet } from 'react-helmet';
import Navigation from './Navigation';

type Props = {
  children?: React$Element<*>,
};

export default function Layout({ children }: Props) {
  return (
    <html lang="en">
      <head>
        <Helmet>
          <title>Atlas</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Helmet>

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
