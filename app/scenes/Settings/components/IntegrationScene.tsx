import { SettingsIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { createInternalLinkActionV2 } from "~/actions";
import { NavigationSection } from "~/actions/sections";
import Breadcrumb from "~/components/Breadcrumb";
import Scene from "~/components/Scene";
import { settingsPath } from "~/utils/routeHelpers";

export function IntegrationScene({
  children,
  ...rest
}: React.ComponentProps<typeof Scene>) {
  const { t } = useTranslation();

  const breadcrumbActions = React.useMemo(
    () => [
      createInternalLinkActionV2({
        name: t("Integrations"),
        section: NavigationSection,
        icon: <SettingsIcon />,
        to: settingsPath("integrations"),
      }),
    ],
    [t]
  );

  return (
    <Scene left={<Breadcrumb actions={breadcrumbActions} />} {...rest}>
      {children}
    </Scene>
  );
}
