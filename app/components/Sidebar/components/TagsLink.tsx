import { observer } from "mobx-react";
import { HashtagIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import * as Scenes from "~/routes/scenes";
import { tagsPath } from "~/utils/routeHelpers";
import { shouldShowTagsLink } from "~/utils/tags";
import SidebarLink from "./SidebarLink";

/**
 * Sidebar link to the workspace tags index page, hidden from users who can see
 * no tags and cannot create one.
 */
function TagsLink() {
  const { t } = useTranslation();
  const { tags } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const canCreate = !!can.createTag;
  const [loaded, setLoaded] = React.useState(false);

  // Only users who cannot create tags may have the link hidden, so only they
  // need the tags up front.
  React.useEffect(() => {
    if (canCreate) {
      return;
    }
    void tags
      .fetchAllIfNeeded()
      .then(() => setLoaded(true))
      // The link stays visible when tags fail to load.
      .catch(() => undefined);
  }, [tags, canCreate]);

  if (
    !shouldShowTagsLink({ loaded, count: tags.orderedData.length, canCreate })
  ) {
    return null;
  }

  return (
    <SidebarLink
      to={tagsPath()}
      icon={<HashtagIcon />}
      exact
      label={t("Tags")}
      onClickIntent={Scenes.Tags.preload}
    />
  );
}

export default observer(TagsLink);
