// @flow
/* global ga */
import * as React from 'react';

export default class Analytics extends React.Component<*> {
  componentDidMount() {
    if (!process.env.GOOGLE_ANALYTICS_ID) return;

    // standard Google Analytics script
    window.ga =
      window.ga ||
      function() {
        // $FlowIssue
        (ga.q = ga.q || []).push(arguments);
      };

    // $FlowIssue
    ga.l = +new Date();
    ga('create', process.env.GOOGLE_ANALYTICS_ID, 'auto');
    ga('send', 'pageview');

    const script = document.createElement('script');
    script.src = 'https://www.google-analytics.com/analytics.js';
    script.async = true;

    if (document.body) {
      document.body.appendChild(script);
    }
  }

  render() {
    return this.props.children || null;
  }
}
