import { observer } from "mobx-react";
import { HashtagIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { tagsPath } from "~/utils/routeHelpers";
import SidebarLink from "./SidebarLink";

/**
 * Sidebar link to the workspace tags index page.
 */
function TagsLink() {
  const { t } = useTranslation();

  return (
    <SidebarLink
      to={tagsPath()}
      icon={<HashtagIcon />}
      exact
      label={t("Tags")}
    />
  );
}

export default observer(TagsLink);
