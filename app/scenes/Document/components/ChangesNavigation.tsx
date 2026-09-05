import { observer } from "mobx-react";
import Flex from "@shared/components/Flex";
import { s } from "@shared/styles";
import Diff from "@shared/editor/extensions/Diff";
import { CaretDownIcon, CaretUpIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Button from "~/components/Button";
import { useDocumentContext } from "~/components/DocumentContext";
import Tooltip from "~/components/Tooltip";
import useQuery from "~/hooks/useQuery";

export const ChangesNavigation = observer(function ChangesNavigation_() {
  const { t } = useTranslation();
  const query = useQuery();
  const showChanges = query.get("changes");
  const { editor, totalChanges } = useDocumentContext();

  if (!showChanges) {
    return null;
  }

  const diffExtension = editor?.extensions.extensions.find(
    (ext) => ext instanceof Diff
  ) as Diff | undefined;
  const currentChangeIndex = diffExtension?.getCurrentChangeIndex() ?? -1;

  return (
    <>
      {totalChanges > 0 && (
        <Flex gap={4} align="center">
          <NavigationLabel>
            {currentChangeIndex >= 0
              ? t("{{ current }} of {{ count }} changes", {
                  current: currentChangeIndex + 1,
                  count: totalChanges,
                })
              : t("{{ count }} changes", {
                  count: totalChanges,
                })}
          </NavigationLabel>
          <Tooltip content={t("Previous change")} placement="bottom">
            <NavigationButton
              icon={<CaretUpIcon />}
              onClick={() => editor?.commands.prevChange()}
              aria-label={t("Previous change")}
            />
          </Tooltip>
          <Tooltip content={t("Next change")} placement="bottom">
            <NavigationButton
              icon={<CaretDownIcon />}
              onClick={() => editor?.commands.nextChange()}
              aria-label={t("Next change")}
            />
          </Tooltip>
        </Flex>
      )}
    </>
  );
});

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
