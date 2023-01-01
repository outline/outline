/* global ga */
import { escape } from "lodash";
import * as React from "react";
import { IntegrationService } from "@shared/types";
import env from "~/env";

const Analytics: React.FC = ({ children }) => {
  // Google Analytics 3
  React.useEffect(() => {
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
    ga("send", "pageview");
    const script = document.createElement("script");
    script.src = "https://www.google-analytics.com/analytics.js";
    script.async = true;

    // Track PWA install event
    window.addEventListener("appinstalled", () => {
      ga("send", "event", "pwa", "install");
    });

    document.body?.appendChild(script);
  }, []);

  // Google Analytics 4
  React.useEffect(() => {
    if (env.analytics.service !== IntegrationService.GoogleAnalytics) {
      return;
    }

    const measurementId = escape(env.analytics.settings?.measurementId);

    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer.push(args);
    }
    gtag("js", new Date());
    gtag("config", measurementId);

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.body?.appendChild(script);
  }, []);

  return <>{children}</>;
};

export default Analytics;
