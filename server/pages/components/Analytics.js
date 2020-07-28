// @flow
import * as React from "react";

function Analytics() {
  if (!process.env.GOOGLE_ANALYTICS_ID) return null;

  return (
    <React.Fragment>
      <script
        dangerouslySetInnerHTML={{
          __html: `
          window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
          ga('create', '${process.env.GOOGLE_ANALYTICS_ID}', 'auto');
          ga('send', 'pageview');
        `,
        }}
      />
      <script async src="https://www.google-analytics.com/analytics.js" />
    </React.Fragment>
  );
}

export default Analytics;
