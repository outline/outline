import { SettingsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import Breadcrumb from "~/components/Breadcrumb";
import Scene from "~/components/Scene";
import { settingsPath } from "~/utils/routeHelpers";

export function IntegrationScene({
  children,
  ...rest
}: React.ComponentProps<typeof Scene>) {
  const { t } = useTranslation();

  return (
    <Scene
      left={
        <Breadcrumb
          items={[
            {
              type: "route",
              title: t("Integrations"),
              icon: <SettingsIcon />,
              to: settingsPath("integrations"),
            },
          ]}
        />
      }
      {...rest}
    >
      {children}
    </Scene>
  );
}
