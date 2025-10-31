import { observer } from "mobx-react";
import { GroupIcon } from "outline-icons";
import * as React from "react";
import Group from "~/models/Group";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import Folder from "./Folder";
import Relative from "./Relative";
import SharedWithMeLink from "./SharedWithMeLink";
import SidebarContext, { groupSidebarContext } from "./SidebarContext";
import SidebarLink from "./SidebarLink";
import { RequestResponse } from "~/hooks/usePaginatedRequest";
import GroupMembership from "~/models/GroupMembership";
import { t } from "i18next";
import { toast } from "sonner";

type Props = {
  /** The group to render */
  group: Group;
  /** The response from the group memberships request */
  response: RequestResponse<GroupMembership>;
};

const GroupLink: React.FC<Props> = ({ group, response }) => {
  const locationSidebarContext = useLocationSidebarContext();
  const sidebarContext = groupSidebarContext(group.id);
  const { loading, next, end, error } = response;
  const [expanded, setExpanded] = React.useState(
    locationSidebarContext === sidebarContext
  );

  React.useEffect(() => {
    if (error) {
      toast.error(t("Could not load shared documents"));
    }
  }, [error, t]);

  const handleDisclosureClick = React.useCallback((ev) => {
    ev?.preventDefault();
    setExpanded((e) => !e);
  }, []);

  React.useEffect(() => {
    if (locationSidebarContext === sidebarContext) {
      setExpanded(true);
    }
  }, [sidebarContext, locationSidebarContext, setExpanded]);

  return (
    <Relative>
      <SidebarLink
        label={group.name}
        icon={<GroupIcon />}
        expanded={expanded}
        onClick={handleDisclosureClick}
        depth={0}
      />
      <SidebarContext.Provider value={sidebarContext}>
        <Folder expanded={expanded}>
          {group.documentMemberships.map((membership) => (
            <SharedWithMeLink
              key={membership.id}
              membership={membership}
              depth={1}
            />
          ))}
          {!end && (
            <SidebarLink
              onClick={next}
              label={`${t("Show more")}…`}
              disabled={loading}
              depth={0}
            />
          )}
        </Folder>
      </SidebarContext.Provider>
    </Relative>
  );
};

export default observer(GroupLink);
