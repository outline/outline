import { m, AnimatePresence } from "framer-motion";
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { depths } from "@shared/styles";
import useStores from "~/hooks/useStores";
import { draggableOnDesktop } from "~/styles";

const transition = {
  type: "spring",
  stiffness: 500,
  damping: 30,
};

/**
 * A small banner that is displayed at the top of the screen when the user is
 * observing another user while editing a document
 */
function ObservingBanner() {
  const { ui, users } = useStores();
  const { t } = useTranslation();
  const user = ui.observingUserId ? users.get(ui.observingUserId) : undefined;

  return (
    <Positioner>
      <AnimatePresence>
        {user && (
          <Banner
            $color={user.color}
            transition={transition}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: -5 }}
            exit={{ opacity: 0, y: -30 }}
          >
            {t("Observing {{ userName }}", { userName: user.name })}
          </Banner>
        )}
      </AnimatePresence>
    </Positioner>
  );
}

const Positioner = styled.div`
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
`;

const Banner = styled(m.div)<{ $color: string }>`
  padding: 6px 6px 1px;
  font-size: 13px;
  font-weight: 500;
  z-index: ${depths.header + 1};
  color: ${(props) => props.theme.white};
  background: ${(props) => props.$color};
  border-bottom-left-radius: 4px;
  border-bottom-right-radius: 4px;
  ${draggableOnDesktop()}
`;

export default observer(ObservingBanner);
