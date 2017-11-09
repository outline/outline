// @flow
import React from 'react';

function Analytics() {
  const id = process.env.GOOGLE_ANALYTICS_ID;
  if (!id) return null;

  return (
    <span>
      <script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${id}');
        `,
        }}
      />
    </span>
  );
}

export default Analytics;
