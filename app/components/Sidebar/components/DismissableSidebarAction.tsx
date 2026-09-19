import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import usePersistedState from "~/hooks/usePersistedState";
import SidebarAction from "./SidebarAction";

type Props = React.ComponentProps<typeof SidebarAction> & {
  /** Unique identifier for the link, the dismissed state is persisted under it */
  id: string;
};

/**
 * A sidebar action that can be permanently dismissed by the user with a cross
 * displayed on hover. Renders nothing once dismissed.
 */
export function DismissableSidebarAction({ id, ...rest }: Props) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = usePersistedState<boolean>(id, false);

  const handleDismiss = React.useCallback(() => {
    setDismissed(true);
  }, [setDismissed]);

  if (dismissed) {
    return null;
  }

  return (
    <SidebarAction
      {...rest}
      menu={
        <Fade>
          <Tooltip content={t("Hide")} delay={500}>
            <DismissButton aria-label={t("Hide")} onClick={handleDismiss}>
              <CloseIcon size={18} />
            </DismissButton>
          </Tooltip>
        </Fade>
      }
    />
  );
}

// Specificity boost to override the icon color set by the parent link.
const DismissButton = styled(NudeButton)`
  && svg {
    color: ${s("textTertiary")};
  }
`;
