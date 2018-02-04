// @flow
import React from 'react';

function Analytics() {
  const id = process.env.GOOGLE_ANALYTICS_ID;
  if (!id) return null;

  return [
    <script
      dangerouslySetInnerHTML={{
        __html: `
        window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
        ga('create', ${id}, 'auto');
        ga('send', 'pageview');
      `,
      }}
    />,
    <script async src="https://www.google-analytics.com/analytics.js" />,
  ];
}

export default Analytics;
