import { observer } from "mobx-react";
import { useCallback } from "react";
import styled from "styled-components";
import { depths } from "@shared/styles";
import { UserPreference } from "@shared/types";
import { performAction } from "~/actions";
import { toggleDocumentStats } from "~/actions/definitions/documents";
import Flex from "~/components/Flex";
import useActionContext from "~/hooks/useActionContext";
import useCurrentUser from "~/hooks/useCurrentUser";
import useKeyDown from "~/hooks/useKeyDown";
import type Document from "~/models/Document";
import isTextInput from "~/utils/isTextInput";
import ConnectionStatus from "./ConnectionStatus";
import DocumentStats from "./DocumentStats";
import { SizeWarning } from "./SizeWarning";

type Props = {
  document: Document;
};

export const Footer = observer(({ document }: Props) => {
  const user = useCurrentUser({ rejectOnEmpty: false });
  const showStats =
    !!user?.getPreference(UserPreference.ShowDocumentStats) &&
    !document.isDeleted;
  const context = useActionContext();

  const handleToggleStats = useCallback(
    (event: KeyboardEvent) => {
      if (document.isDeleted) {
        return;
      }

      // The command bar handles this shortcut everywhere else, it ignores
      // keystrokes while focus is in a text input.
      const target = event.target;
      if (!(target instanceof Element) || !isTextInput(target)) {
        return;
      }
      event.preventDefault();
      void performAction(toggleDocumentStats, context);
    },
    [context, document.isDeleted]
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
