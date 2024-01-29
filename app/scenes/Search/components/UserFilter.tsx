import { observer } from "mobx-react";
import { UserIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Avatar from "~/components/Avatar";
import { AvatarSize } from "~/components/Avatar/Avatar";
import FilterOptions from "~/components/FilterOptions";
import useStores from "~/hooks/useStores";

type Props = {
  userId: string | undefined;
  onSelect: (key: string | undefined) => void;
};

function UserFilter(props: Props) {
  const { onSelect, userId } = props;
  const { t } = useTranslation();
  const { users } = useStores();

  React.useEffect(() => {
    void users.fetchPage({
      limit: 100,
    });
  }, [users]);

  const options = React.useMemo(() => {
    const userOptions = users.all.map((user) => ({
      key: user.id,
      label: user.name,
      icon: <Avatar model={user} showBorder={false} size={AvatarSize.Small} />,
    }));
    return [
      {
        key: "",
        label: t("Any author"),
        icon: <NoAuthor size={20} />,
      },
      ...userOptions,
    ];
  }, [users.all, t]);

  return (
    <FilterOptions
      options={options}
      activeKey={userId}
      onSelect={onSelect}
      defaultLabel={t("Any author")}
      selectedPrefix={`${t("Author")}:`}
    />
  );
}

const NoAuthor = styled(UserIcon)`
  margin-left: -2px;
`;

export default observer(UserFilter);
