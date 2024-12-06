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

type Props = {
  /** The group to render */
  group: Group;
};

const GroupLink: React.FC<Props> = ({ group }) => {
  const locationSidebarContext = useLocationSidebarContext();
  const sidebarContext = groupSidebarContext(group.id);
  const [expanded, setExpanded] = React.useState(
    locationSidebarContext === sidebarContext
  );

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
        </Folder>
      </SidebarContext.Provider>
    </Relative>
  );
};

export default observer(GroupLink);
