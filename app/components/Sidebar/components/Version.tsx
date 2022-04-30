import * as React from "react";
import styled from "styled-components";
import Badge from "~/components/Badge";
import { version } from "../../../../package.json";
import SidebarLink from "./SidebarLink";

export default function Version() {
  const [releasesBehind, setReleasesBehind] = React.useState(0);

  React.useEffect(() => {
    async function loadReleases() {
      const res = await fetch(
        "https://api.github.com/repos/outline/outline/releases"
      );
      const releases = await res.json();

      if (Array.isArray(releases)) {
        const computedReleasesBehind = releases
          .map((release) => release.tag_name)
          .findIndex((tagName) => tagName === `v${version}`);

        if (computedReleasesBehind >= 0) {
          setReleasesBehind(computedReleasesBehind);
        }
      }
    }

    loadReleases();
  }, []);

  return (
    <SidebarLink
      href="https://github.com/outline/outline/releases"
      label={
        <>
          v{version}
          <br />
          <LilBadge>
            {releasesBehind === 0
              ? "Up to date"
              : `${releasesBehind} version${
                  releasesBehind === 1 ? "" : "s"
                } behind`}
          </LilBadge>
        </>
      }
    />
  );
}

const LilBadge = styled(Badge)`
  margin-left: 0;
`;
