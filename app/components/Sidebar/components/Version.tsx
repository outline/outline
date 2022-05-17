import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Badge from "~/components/Badge";
import { version } from "../../../../package.json";
import SidebarLink from "./SidebarLink";

export default function Version() {
  const [releasesBehind, setReleasesBehind] = React.useState(0);
  const { t } = useTranslation();

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
              ? t("Up to date")
              : t(`{{ releasesBehind }} versions behind`, {
                  releasesBehind,
                  count: releasesBehind,
                })}
          </LilBadge>
        </>
      }
    />
  );
}

const LilBadge = styled(Badge)`
  margin-left: 0;
`;
