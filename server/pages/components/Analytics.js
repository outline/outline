// @flow
import React from 'react';

function getScript() {
  if (!process.env.GOOGLE_ANALYTICS_ID) return undefined;

  return {
    __html: `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${process.env.GOOGLE_ANALYTICS_ID}');
    `,
  };
}

function Analytics() {
  if (!process.env.GOOGLE_ANALYTICS_ID) return null;

  return (
    <span>
      <script
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.GOOGLE_ANALYTICS_ID}`}
      />
      <script dangerouslySetInnerHTML={getScript()} />
    </span>
  );
}

export default Analytics;
