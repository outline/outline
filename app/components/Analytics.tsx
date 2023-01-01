/* eslint-disable prefer-rest-params */
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
    script.type = "text/javascript";
    script.src = "https://www.google-analytics.com/analytics.js";
    script.async = true;

    // Track PWA install event
    window.addEventListener("appinstalled", () => {
      ga("send", "event", "pwa", "install");
    });

    document.getElementsByTagName("head")[0]?.appendChild(script);
  }, []);

  // Google Analytics 4
  React.useEffect(() => {
    if (env.analytics.service !== IntegrationService.GoogleAnalytics) {
      return;
    }

    const measurementId = escape(env.analytics.settings?.measurementId);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      restricted_data_processing: true,
    });

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.getElementsByTagName("head")[0]?.appendChild(script);
  }, []);

  return <>{children}</>;
};

export default Analytics;
