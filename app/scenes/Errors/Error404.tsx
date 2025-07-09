import { useTranslation, Trans } from "react-i18next";
import { useLocation, useHistory } from "react-router-dom";
import Flex from "@shared/components/Flex";
import Button from "~/components/Button";
import Empty from "~/components/Empty";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import { homePath, searchPath } from "~/utils/routeHelpers";

const Error404 = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();

  // Extract potential page name from URL path
  const pathname = location.pathname;
  const isDocumentPath =
    pathname.startsWith("/doc/") && pathname !== "/doc/new";
  const potentialPageName = isDocumentPath
    ? pathname.split("/").pop()?.replace(/-/g, " ") || ""
    : "";

  const handleCreatePage = () => {
    if (potentialPageName) {
      // Navigate to new document creation with the page name as title
      history.push(`/doc/new?title=${encodeURIComponent(potentialPageName)}`);
    } else {
      // Fallback to regular document creation
      history.push("/doc/new");
    }
  };

  const handleHomeClick = () => {
    history.push(homePath());
  };

  const handleSearchClick = () => {
    history.push(searchPath());
  };

  return (
    <Scene title={t("Not found")}>
      <Heading>{t("Not found")}</Heading>
      <Flex gap={20} style={{ maxWidth: 500 }} column>
        <Empty size="large">
          <Trans>
            The page you&apos;re looking for cannot be found. It might have been
            deleted or the link is incorrect.
          </Trans>
        </Empty>
        <Flex gap={8}>
          <Button onClick={handleHomeClick} hideIcon>
            {t("Home")}
          </Button>
          <Button onClick={handleSearchClick} neutral>
            {t("Search")}…
          </Button>
          {isDocumentPath && potentialPageName && (
            <Button onClick={handleCreatePage} neutral>
              {t("Create this page")}
            </Button>
          )}
        </Flex>
      </Flex>
    </Scene>
  );
};

export default Error404;
