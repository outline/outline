import * as React from "react";
import { useTheme } from "styled-components";

import Frame from "../components/Frame";
import { EmbedProps as Props } from ".";

const UUID_REGEX =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const URL_PATH_REGEX = new RegExp(
  `/dashboard/#/nc/view/(?<viewId>${UUID_REGEX})(\\?.*)?$`
);

let triggeredNavigation = false; // used to block duplicate navigation attempts

const NocoDb: React.FC<Props> = (props) => {
  const { isDark } = useTheme();
  const {
    matches: { groups },
    href,
  } = props.attrs;

  // add Outline-specific params to the url
  const [src, origin] = React.useMemo(() => {
    const url = new URL(href.replace("/#/", "/%23/")); // NocoDB has a hash in its url which breaks built-in url parsing
    url.searchParams.append("dark", isDark ? "1" : "0"); // NocoDB dark mode setting should match Outline
    if (!url.searchParams.has("url_rules")) {
      // Replace links to Outline documents in NocoDB with "View Doc" and open in the same tab
      const host = location.host.replaceAll(".", "\\.");
      const sharedDocRegex = `^https?://${host}/share/${UUID_REGEX}(\\?.*)?`;
      const rules = {
        [sharedDocRegex]: {
          overlay: "View Doc",
          behavior: "replace",
        },
      };
      url.searchParams.append("url_rules", JSON.stringify(rules));
    }
    return [url.toString().replace("/%23/", "/#/"), url.origin];
  }, [href]);

  React.useEffect(() => {
    // capture iframe's navigation attempts and navigate the parent page instead
    const handleMessage = (ev: MessageEvent<any>) => {
      if (ev.origin === origin) {
        if (ev.data?.event === "locationchange") {
          const href = ev.data.payload.value;
          const url = new URL(href);
          if (url.origin === location.origin && !triggeredNavigation) {
            triggeredNavigation = true;
            props.navigate(url.pathname + url.search);
          } else {
            window.location = href;
          }
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [href]);

  return (
    <Frame
      height="600"
      {...props}
      src={src}
      title={`NocoDB (${groups?.viewId})`}
      border
    />
  );
};

export default Object.assign(NocoDb, {
  ENABLED: [],
  URL_PATH_REGEX,
});
