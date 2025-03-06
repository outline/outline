import { observer } from "mobx-react";
import { UserIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Avatar, AvatarSize } from "~/components/Avatar";
import FilterOptions from "~/components/FilterOptions";
import useStores from "~/hooks/useStores";

type Props = {
  /** The currently selected user ID */
  userId: string | undefined;
  /** Callback to call when a user is selected */
  onSelect: (key: string | undefined) => void;
};

const fetchQueryOptions = { sort: "name", direction: "ASC" };

function UserFilter(props: Props) {
  const { onSelect, userId } = props;
  const { t } = useTranslation();
  const { users } = useStores();

  const options = React.useMemo(() => {
    const userOptions = users.all.map((user) => ({
      key: user.id,
      label: user.name,
      icon: <StyledAvatar model={user} size={AvatarSize.Small} />,
    }));
    return [
      {
        key: "",
        label: t("Any author"),
        icon: <UserIcon size={20} />,
      },
      ...userOptions,
    ];
  }, [users.all, t]);

  return (
    <FilterOptions
      options={options}
      selectedKeys={[userId]}
      onSelect={onSelect}
      defaultLabel={t("Any author")}
      fetchQuery={users.fetchPage}
      fetchQueryOptions={fetchQueryOptions}
      showFilter
    />
  );
}

const StyledAvatar = styled(Avatar)`
  margin: 2px;
`;

export default observer(UserFilter);
