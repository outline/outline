import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Badge from "~/components/Badge";
import { client } from "~/utils/ApiClient";
import Logger from "~/utils/Logger";
import { version as currentVersion } from "../../../../package.json";
import SidebarLink from "./SidebarLink";

export default function Version() {
  const [versionsBehind, setVersionsBehind] = React.useState(-1);
  const { t } = useTranslation();

  React.useEffect(() => {
    async function loadVersionInfo() {
      try {
        // Fetch version info from the server-side proxy
        const res = await client.post("/installation.info");
        if (res.data && res.data.versionsBehind >= 0) {
          setVersionsBehind(res.data.versionsBehind);
        }
      } catch (error) {
        Logger.error("Failed to load version info", error);
      }
    }

    void loadVersionInfo();
  }, []);

  return (
    <SidebarLink
      target="_blank"
      href="https://github.com/outline/outline/releases"
      label={
        <>
          v{currentVersion}
          {versionsBehind >= 0 && (
            <>
              <br />
              <LilBadge>
                {versionsBehind === 0
                  ? t("Up to date")
                  : t(`{{ releasesBehind }} versions behind`, {
                      releasesBehind: versionsBehind,
                      count: versionsBehind,
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
