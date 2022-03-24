/* global ga */
import * as React from "react";
import env from "~/env";

export default class Analytics extends React.Component {
  componentDidMount() {
    if (!env.GOOGLE_ANALYTICS_ID) {
      return;
    }

    // standard Google Analytics script
    window.ga =
      window.ga ||
      function (...args) {
        (ga.q = ga.q || []).push(args);
      };

    ga.l = +new Date();
    ga("create", env.GOOGLE_ANALYTICS_ID, "auto");
    ga("set", {
      dimension1: "true",
    });
    ga("send", "pageview");
    const script = document.createElement("script");
    script.src = "https://www.google-analytics.com/analytics.js";
    script.async = true;

    // Track PWA install event
    window.addEventListener("appinstalled", () => {
      ga("send", "event", "pwa", "install");
    });

    if (document.body) {
      document.body.appendChild(script);
    }
  }

  render() {
    return this.props.children || null;
  }
}
