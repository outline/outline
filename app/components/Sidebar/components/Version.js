// @flow
import * as React from "react";
import styled from "styled-components";
import Badge from "components/Badge";
import { version } from "../../../../package.json";
import SidebarLink from "./SidebarLink";

export default function Version() {
  const [releasesBehind, setReleasesBehind] = React.useState(0);

  React.useEffect(() => {
    async function loadReleases() {
      let out = 0;
      const res = await fetch(
        "https://api.github.com/repos/outline/outline/releases"
      );
      const releases = await res.json();
      for (const release of releases) {
        if (release.tag_name === `v${version}`) {
          return setReleasesBehind(out);
        } else {
          out++;
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
