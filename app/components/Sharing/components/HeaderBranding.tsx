import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { ellipsis, s } from "@shared/styles";
import { AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import TeamLogo from "~/components/TeamLogo";
import useShareBranding from "~/hooks/useShareBranding";
import type Share from "~/models/Share";

type Props = {
  share: Share;
};

/**
 * Renders the team or share-customized branding (logo + name) for shared
 * documents that do not have a sidebar.
 */
function HeaderBranding({ share }: Props) {
  const { t } = useTranslation();
  const { displayName, displayLogoUrl, displayLogoModel, brandingAvailable } =
    useShareBranding(share);

  if (!brandingAvailable) {
    return null;
  }

  return (
    <Wrapper align="center" gap={8}>
      <TeamLogo
        model={displayLogoModel}
        src={displayLogoUrl ?? undefined}
        size={AvatarSize.Large}
        alt={t("Logo")}
      />
      {displayName && <Name>{displayName}</Name>}
    </Wrapper>
  );
}

const Wrapper = styled(Flex)`
  min-width: 0;
  color: ${s("text")};
`;

const Name = styled.span`
  ${ellipsis()}
  font-size: 15px;
  font-weight: 500;
`;

export default observer(HeaderBranding);
