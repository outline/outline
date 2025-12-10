import Flex from "@shared/components/Flex";
import { s } from "@shared/styles";
import { CaretDownIcon, CaretUpIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import { type Editor } from "~/editor";
import type Revision from "~/models/Revision";

type Props = {
  revision: Revision;
  editorRef: React.RefObject<Editor>;
};

export const ChangesNavigation = ({ revision, editorRef }: Props) => {
  const { t } = useTranslation();

  return (
    <>
      {revision.changeset?.changes && revision.changeset.changes.length > 0 && (
        <ChangeNavigation gap={4}>
          <NavigationLabel>
            {t("{{ count }} changes", {
              count: revision.changeset.changes.length,
            })}
          </NavigationLabel>
          <Tooltip content={t("Previous change")} placement="bottom">
            <NavigationButton
              onClick={() => editorRef.current?.commands.prevChange()}
              aria-label={t("Previous change")}
            >
              <CaretUpIcon />
            </NavigationButton>
          </Tooltip>
          <Tooltip content={t("Next change")} placement="bottom">
            <NavigationButton
              onClick={() => editorRef.current?.commands.nextChange()}
              aria-label={t("Next change")}
            >
              <CaretDownIcon />
            </NavigationButton>
          </Tooltip>
        </ChangeNavigation>
      )}
    </>
  );
};

const ChangeNavigation = styled(Flex)`
  padding: 8px 12px;
  align-items: center;
`;

const NavigationButton = styled(NudeButton)`
  width: 32px;
  height: 32px;

  &:hover,
  &[aria-expanded="true"] {
    background: ${s("sidebarControlHoverBackground")};
  }

  &:disabled {
    color: ${s("textTertiary")};
    background: none;
    cursor: default;
  }
`;

const NavigationLabel = styled.span`
  color: ${s("textSecondary")};
  font-size: 14px;
  font-weight: 500;
  margin-right: 8px;
  user-select: none;
`;
