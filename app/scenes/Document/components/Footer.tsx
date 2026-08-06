import { observer } from "mobx-react";
import { useCallback } from "react";
import styled from "styled-components";
import { depths } from "@shared/styles";
import { UserPreference } from "@shared/types";
import Flex from "~/components/Flex";
import useCurrentUser from "~/hooks/useCurrentUser";
import useKeyDown from "~/hooks/useKeyDown";
import type Document from "~/models/Document";
import ConnectionStatus from "./ConnectionStatus";
import DocumentStats from "./DocumentStats";
import { SizeWarning } from "./SizeWarning";

type Props = {
  document: Document;
};

export const Footer = observer(({ document }: Props) => {
  const user = useCurrentUser({ rejectOnEmpty: false });
  const showStats = !!user?.getPreference(UserPreference.ShowDocumentStats);

  const handleToggleStats = useCallback(
    async (event: KeyboardEvent) => {
      if (!user) {
        return;
      }
      event.preventDefault();
      user.setPreference(UserPreference.ShowDocumentStats, !showStats);
      await user.save();
    },
    [user, showStats]
  );

  useKeyDown("g", handleToggleStats, { metaKey: true, shiftKey: true });

  return (
    <FooterWrapper column align="flex-end">
      <Buttons align="center" gap={20}>
        <ConnectionStatus />
        <SizeWarning document={document} />
      </Buttons>
      {showStats && <DocumentStats />}
    </FooterWrapper>
  );
});

const FooterWrapper = styled(Flex)`
  position: sticky;
  bottom: 0;
  align-self: flex-end;
  margin-top: auto;
  padding-top: 12px;
  z-index: ${depths.documentFooter};
`;

const Buttons = styled(Flex)`
  margin-inline-end: 12px;
  margin-bottom: 12px;
`;
