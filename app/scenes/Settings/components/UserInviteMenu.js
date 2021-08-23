// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import FilterOptions from "components/FilterOptions";
import Flex from "components/Flex";

type Props = {|
  activeKey: string,
  onSelect: (key: ?string) => void,
  setTop: boolean,
|};

const UserInviteMenu = ({ activeKey, onSelect, setTop }: Props) => {
  const { t } = useTranslation();
  const options = React.useMemo(
    () => [
      {
        key: "member",
        label: t("Member"),
      },
      {
        key: "viewer",
        label: t("Viewer"),
      },
      {
        key: "admin",
        label: t("Admin"),
      },
    ],
    [t]
  );

  return (
    <Wrapper setTop={setTop}>
      <FilterOptions
        options={options}
        activeKey={activeKey}
        onSelect={onSelect}
        defaultLabel={t("Member")}
      />
    </Wrapper>
  );
};

const Wrapper = styled(Flex)`
  margin: 0px;
  position: relative;
  flex-shrink: unset;
  top: ${(props) => (props.setTop ? "28px" : "0")};
`;

export default UserInviteMenu;
