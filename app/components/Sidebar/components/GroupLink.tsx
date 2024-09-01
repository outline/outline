import { observer } from "mobx-react";
import { GroupIcon } from "outline-icons";
import * as React from "react";
import Group from "~/models/Group";
import Folder from "./Folder";
import Relative from "./Relative";
import SharedWithMeLink from "./SharedWithMeLink";
import SidebarContext from "./SidebarContext";
import SidebarLink from "./SidebarLink";

type Props = {
  /** The group to render */
  group: Group;
};

const GroupLink: React.FC<Props> = ({ group }) => {
  const [expanded, setExpanded] = React.useState(false);

  const handleDisclosureClick = React.useCallback((ev) => {
    ev?.preventDefault();
    setExpanded((e) => !e);
  }, []);

  return (
    <Relative>
      <SidebarLink
        label={group.name}
        icon={<GroupIcon />}
        expanded={expanded}
        onClick={handleDisclosureClick}
        depth={0}
      />
      <SidebarContext.Provider value={group.id}>
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
