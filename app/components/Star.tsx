import { observer } from "mobx-react";
import { StarredIcon, UnstarredIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import styled, { useTheme } from "styled-components";
import { hover } from "@shared/styles";
import type Notebook from "~/models/Notebook";
import type Note from "~/models/Note";
import { starNotebook, unstarNotebook } from "~/actions/definitions/notebooks";
import { starNote, unstarNote } from "~/actions/definitions/documents";
import { ActionContextProvider } from "~/hooks/useActionContext";
import NudeButton from "./NudeButton";
type Props = {
  /** Target collection */
  notebook?: Notebook;
  /** Target note */
  note?: Note;
  /** Size of the star */
  size?: number;
  /** Color override for the star */
  color?: string;
};
function Star({ size, note, notebook, color, ...rest }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const target = note || notebook;
  if (!target) {
    return null;
  }
  return (
    <ActionContextProvider
      value={{
        activeModels: [note, notebook].filter((m): m is Note | Notebook => !!m),
      }}
    >
      <NudeButton
        hideOnActionDisabled
        tooltip={{
          content: target.isStarred ? t("Unstar document") : t("Star document"),
          delay: 500,
        }}
        action={
          notebook
            ? notebook.isStarred
              ? unstarNotebook
              : starNotebook
            : note
              ? note.isStarred
                ? unstarNote
                : starNote
              : undefined
        }
        size={size}
        {...rest}
      >
        {target.isStarred ? (
          <AnimatedStar size={size} color={theme.yellow} />
        ) : (
          <AnimatedStar
            size={size}
            color={color ?? theme.textTertiary}
            as={UnstarredIcon}
          />
        )}
      </NudeButton>
    </ActionContextProvider>
  );
}
export const AnimatedStar = styled(StarredIcon)`
  flex-shrink: 0;
  transition: all 100ms ease-in-out;

  &: ${hover} {
    transform: scale(1.1);
  }
  &:active {
    transform: scale(0.95);
  }

  @media print {
    display: none;
  }
`;
export default observer(Star);
