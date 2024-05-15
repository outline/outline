import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Badge from "~/components/Badge";
import { version } from "../../../../package.json";
import SidebarLink from "./SidebarLink";

export default function Version() {
  const [releasesBehind, setReleasesBehind] = React.useState(-1);
  const { t } = useTranslation();

  React.useEffect(() => {
    async function loadReleases() {
      const res = await fetch(
        "https://api.github.com/repos/outline/outline/releases"
      );
      const releases = await res.json();

      if (Array.isArray(releases)) {
        const everyNewRelease = releases
          .map((release) => release.tag_name)
          .findIndex((tagName) => tagName === `v${version}`);

        const onlyFullNewRelease = releases
          .filter((release) => !release.prerelease)
          .map((release) => release.tag_name)
          .findIndex((tagName) => tagName === `v${version}`);

        const computedReleasesBehind = version.includes("pre")
          ? everyNewRelease
          : onlyFullNewRelease;

        if (computedReleasesBehind >= 0) {
          setReleasesBehind(computedReleasesBehind);
        }
      }
    }

    void loadReleases();
  }, []);

  return (
    <SidebarLink
      target="_blank"
      href="https://github.com/outline/outline/releases"
      label={
        <>
          v{version}
          {releasesBehind >= 0 && (
            <>
              <br />
              <LilBadge>
                {releasesBehind === 0
                  ? t("Up to date")
                  : t(`{{ releasesBehind }} versions behind`, {
                      releasesBehind,
                      count: releasesBehind,
                    })}
              </LilBadge>
            </>
          )}
        </>
      }
    />
  );
}

const LilBadge = styled(Badge)`
  margin-left: 0;
`;
