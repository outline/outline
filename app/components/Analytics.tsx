/* eslint-disable prefer-rest-params */
/* global ga */
import escape from "lodash/escape";
import * as React from "react";
import { IntegrationService, PublicEnv } from "@shared/types";
import env from "~/env";

type Props = {
  children?: React.ReactNode;
};

// TODO: Refactor this component to allow injection from plugins
const Analytics: React.FC = ({ children }: Props) => {
  // Google Analytics 3
  React.useEffect(() => {
    if (!env.GOOGLE_ANALYTICS_ID?.startsWith("UA-")) {
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
    const measurementIds = [];

    if (env.GOOGLE_ANALYTICS_ID?.startsWith("G-")) {
      measurementIds.push(env.GOOGLE_ANALYTICS_ID);
    }

    (env.analytics as PublicEnv["analytics"]).forEach((integration) => {
      if (integration.service === IntegrationService.GoogleAnalytics) {
        measurementIds.push(escape(integration.settings?.measurementId));
      }
    });

    if (measurementIds.length === 0) {
      return;
    }

    const params = {
      allow_google_signals: false,
      restricted_data_processing: true,
    };

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());

    for (const measurementId of measurementIds) {
      window.gtag("config", measurementId, params);
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementIds[0]}`;
    script.async = true;
    document.getElementsByTagName("head")[0]?.appendChild(script);
  }, []);

  // Matomo
  React.useEffect(() => {
    (env.analytics as PublicEnv["analytics"]).forEach((integration) => {
      if (integration.service !== IntegrationService.Matomo) {
        return;
      }

      // @ts-expect-error - Matomo global variable
      const _paq = (window._paq = window._paq || []);
      _paq.push(["trackPageView"]);
      _paq.push(["enableLinkTracking"]);
      (function () {
        const u = integration.settings?.instanceUrl;
        _paq.push(["setTrackerUrl", u + "matomo.php"]);
        _paq.push(["setSiteId", integration.settings?.measurementId]);
        const d = document,
          g = d.createElement("script"),
          s = d.getElementsByTagName("script")[0];
        g.type = "text/javascript";
        g.async = true;
        g.src = u + "matomo.js";
        s.parentNode?.insertBefore(g, s);
      })();
    });
  }, []);

  // Umami
  React.useEffect(() => {
    (env.analytics as PublicEnv["analytics"]).forEach((integration) => {
      if (integration.service !== IntegrationService.Umami) {
        return;
      }

      const script = document.createElement("script");
      script.defer = true;
      script.src = `${integration.settings?.instanceUrl}${integration.settings?.scriptName}`;
      script.setAttribute(
        "data-website-id",
        integration.settings?.measurementId
      );
      document.getElementsByTagName("head")[0]?.appendChild(script);
    });
  }, []);

  return <>{children}</>;
};

export default Analytics;
