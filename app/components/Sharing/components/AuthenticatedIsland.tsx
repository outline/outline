import { observer } from "mobx-react";
import { EditIcon, SettingsIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { ellipsis, s } from "@shared/styles";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import useCurrentUser from "~/hooks/useCurrentUser";
import { useLocationSidebarContext } from "~/hooks/useLocationSidebarContext";
import usePolicy from "~/hooks/usePolicy";
import AccountMenu from "~/menus/AccountMenu";
import type Document from "~/models/Document";
import type Share from "~/models/Share";
import { documentEditPath } from "~/utils/routeHelpers";
import ShareSettingsPopover from "./ShareSettingsPopover";

type Props = {
  /** The document that is shown on the shared page. */
  document: Document;
  /** The share that the document is shown through, if it is loaded. */
  share?: Share;
  /** Whether to hide the name of the user to save space. */
  compact?: boolean;
};

/**
 * Collects the controls that are only available to a signed-in user into one
 * floating island, so that they stay visually separate from the public content
 * of a shared page.
 */
function AuthenticatedIsland({ document, share, compact }: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const can = usePolicy(document);
  const sidebarContext = useLocationSidebarContext();

  if (!user) {
    return null;
  }

  return (
    <Island align="center" gap={2}>
      <AccountMenu>
        <UserButton type="button">
          <Avatar
            model={user}
            size={AvatarSize.Small}
            alt={t("Avatar of {{ name }}", { name: user.name })}
            showHoverCard={false}
          />
          {!compact && <Name>{user.name}</Name>}
        </UserButton>
      </AccountMenu>
      {can.update && share && (
        <ShareSettingsPopover share={share}>
          <IconButton size={24} aria-label={t("Display settings")}>
            <SettingsIcon />
          </IconButton>
        </ShareSettingsPopover>
      )}
      {can.update && (
        <Tooltip
          content={t("Edit {{noun}}", { noun: document.noun })}
          shortcut="e"
          placement="bottom"
        >
          <IconButton
            as={Link}
            size={24}
            to={{
              pathname: documentEditPath(document),
              state: { sidebarContext },
            }}
            aria-label={t("Edit")}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      )}
    </Island>
  );
}

const Island = styled(Flex)`
  flex-shrink: 0;
  margin-inline-start: 4px;
  padding: 2px;
  border-radius: 15px;
  border: 1px solid ${s("divider")};
  background: ${s("backgroundSecondary")};
  pointer-events: auto;
`;

const UserButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 160px;
  height: 24px;
  margin: 0;
  padding: 0 6px 0 2px;
  border: 0;
  border-radius: 12px;
  background: none;
  color: ${s("text")};
  cursor: var(--pointer);
  font-size: 13px;
  font-weight: 500;

  &:hover,
  &[aria-expanded="true"] {
    background: ${s("backgroundTertiary")};
  }
`;

const IconButton = styled(NudeButton)`
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: ${s("textSecondary")};

  &:hover,
  &[aria-expanded="true"] {
    background: ${s("backgroundTertiary")};
    color: ${s("text")};
  }
`;

const Name = styled.span`
  ${ellipsis()}
`;

export default observer(AuthenticatedIsland);
