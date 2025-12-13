import Flex from "@shared/components/Flex";
import { s } from "@shared/styles";
import { CaretDownIcon, CaretUpIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Button from "~/components/Button";
import Tooltip from "~/components/Tooltip";
import { type Editor } from "~/editor";
import useQuery from "~/hooks/useQuery";
import type Revision from "~/models/Revision";

type Props = {
  revision: Revision;
  editorRef: React.RefObject<Editor>;
};

export const ChangesNavigation = ({ revision, editorRef }: Props) => {
  const { t } = useTranslation();
  const query = useQuery();
  const showChanges = query.get("changes");

  if (!showChanges) {
    return null;
  }

  return (
    <>
      {revision.changeset?.changes && revision.changeset.changes.length > 0 && (
        <Flex gap={4} align="center">
          <NavigationLabel>
            {t("{{ count }} changes", {
              count: revision.changeset.changes.length,
            })}
          </NavigationLabel>
          <Tooltip content={t("Previous change")} placement="bottom">
            <NavigationButton
              icon={<CaretUpIcon />}
              onClick={() => editorRef.current?.commands.prevChange()}
              aria-label={t("Previous change")}
            />
          </Tooltip>
          <Tooltip content={t("Next change")} placement="bottom">
            <NavigationButton
              icon={<CaretDownIcon />}
              onClick={() => editorRef.current?.commands.nextChange()}
              aria-label={t("Next change")}
            />
          </Tooltip>
        </Flex>
      )}
    </>
  );
};

const NavigationButton = styled(Button).attrs({
  borderOnHover: true,
  neutral: true,
})`
  width: 32px;
  height: 32px;
`;

const NavigationLabel = styled.span`
  color: ${s("textSecondary")};
  font-size: 14px;
  font-weight: 500;
  margin-right: 8px;
  user-select: none;
`;
