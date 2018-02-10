// @flow
import * as React from 'react';

function Analytics() {
  const id = process.env.GOOGLE_ANALYTICS_ID;

  return (
    <React.Fragment>
      <script
        dangerouslySetInnerHTML={{
          __html: `
          window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
          ga('create', ${id}, 'auto');
          ga('send', 'pageview');
        `,
        }}
      />
      {id && (
        <script async src="https://www.google-analytics.com/analytics.js" />
      )}
    </React.Fragment>
  );
}

export default Analytics;
