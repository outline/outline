import { observer } from "mobx-react";
import { UserIcon } from "outline-icons";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Avatar, AvatarSize } from "~/components/Avatar";
import FilterOptions from "~/components/FilterOptions";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

type Props = {
  /** The currently selected user ID */
  userId: string | undefined;
  /** Label for the option that matches every user, defaults to "Any author" */
  anyLabel?: string;
  /** Callback to call when a user is selected */
  onSelect: (key: string | undefined) => void;
};

const fetchQueryOptions = { sort: "name", direction: "ASC" };

function UserFilter(props: Props) {
  const { onSelect, userId } = props;
  const { t } = useTranslation();
  const { users } = useStores();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const anyLabel = props.anyLabel ?? t("Any author");

  const options = useMemo(() => {
    const userOptions = users.all.map((user) => ({
      key: user.id,
      label: user.name,
      icon: <StyledAvatar model={user} size={AvatarSize.Small} />,
    }));
    return [
      {
        key: "",
        label: anyLabel,
        icon: <UserIcon size={20} />,
      },
      ...userOptions,
    ];
  }, [users.all, anyLabel]);

  return (
    <FilterOptions
      options={options}
      selectedKeys={[userId]}
      onSelect={onSelect}
      defaultLabel={anyLabel}
      fetchQuery={can.listUsers ? users.fetchPage : undefined}
      fetchQueryOptions={fetchQueryOptions}
      showFilter
    />
  );
}

const StyledAvatar = styled(Avatar)`
  margin: 2px;
`;

export default observer(UserFilter);
