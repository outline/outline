import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import Empty from "~/components/Empty";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import { AppPage } from "~/components/AppPage";
import { canAccessRoute, MIN_ROLE_FOR_ROUTE } from "../../src/mocks/access";
import { currentRole } from "../../src/mocks/shop";

interface Props {
  children: JSX.Element;
}

/**
 * Hides a page from a role that is not allowed it.
 *
 * This is presentation, not security: the mock runs in the browser, so there
 * is no boundary to enforce. It keeps people out of pages that are not their
 * job rather than protecting data from them.
 *
 * @returns the page, or a note explaining why it is not shown.
 */
export function RequireRole({ children }: Props) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const role = currentRole();

  if (role && canAccessRoute(role, pathname)) {
    return children;
  }

  const required = Object.entries(MIN_ROLE_FOR_ROUTE).find(
    ([route]) => pathname === route || pathname.startsWith(`${route}/`)
  )?.[1];

  return (
    <AppPage
      title={t("Not your department")}
      description={t("This page is kept to a smaller group.")}
    >
      <Empty>
        {required
          ? t("You need to be a {{role}} to open this.", { role: t(required) })
          : t("You do not have access to this page.")}
      </Empty>
      <Flex style={{ paddingTop: 16 }}>
        <Text type="tertiary" size="small">
          {t("Signed in as")} {role ? t(role) : t("nobody")}
        </Text>
      </Flex>
    </AppPage>
  );
}
