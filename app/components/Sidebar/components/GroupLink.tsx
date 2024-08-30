import { observer } from "mobx-react";
import { GroupIcon } from "outline-icons";
import * as React from "react";
import Group from "~/models/Group";
import useStores from "~/hooks/useStores";
import Folder from "./Folder";
import Relative from "./Relative";
import SharedWithMeLink from "./SharedWithMeLink";
import SidebarLink from "./SidebarLink";

type Props = {
  /** The group to render */
  group: Group;
};

const GroupLink: React.FC<Props> = ({ group }) => {
  const { groupMemberships } = useStores();
  const [expanded, setExpanded] = React.useState(false);
  const [prefetched, setPrefetched] = React.useState(false);

  const handleDisclosureClick = React.useCallback((ev) => {
    ev?.preventDefault();
    setExpanded((e) => !e);
  }, []);

  const handlePrefetch = React.useCallback(() => {
    if (prefetched) {
      return;
    }
    void groupMemberships.fetchAll({ groupId: group.id });
    setPrefetched(true);
  }, [groupMemberships, prefetched, group]);

  React.useEffect(() => {
    if (expanded) {
      handlePrefetch();
    }
  }, [expanded, handlePrefetch]);

  return (
    <Relative>
      <SidebarLink
        label={group.name}
        icon={<GroupIcon />}
        expanded={expanded}
        onClickIntent={handlePrefetch}
        onClick={handleDisclosureClick}
        depth={0}
      />
      <Folder expanded={expanded}>
        {group.documentMemberships.map((membership) => (
          <SharedWithMeLink
            key={membership.id}
            membership={membership}
            depth={1}
          />
        ))}
      </Folder>
    </Relative>
  );
};

export default observer(GroupLink);
