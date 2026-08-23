import { WarningIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { NoteValidation } from "@shared/validations";
import type Note from "~/models/Note";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";
type Props = {
  note: Note;
};
export const SizeWarning = ({ note }: Props) => {
  const { t } = useTranslation();
  const length = ProsemirrorHelper.toPlainText(note).length;
  if (length < NoteValidation.maxRecommendedLength) {
    return null;
  }
  return (
    <Tooltip
      content={
        <Centered>
          <strong>{t("Warning")}</strong>
          <br />
          {t("This document is large which may affect performance")}
        </Centered>
      }
    >
      <Button>
        <Fade>
          <WarningIcon />
        </Fade>
      </Button>
    </Tooltip>
  );
};
const Button = styled(NudeButton)`
  display: none;

  ${breakpoint("tablet")`
    display: block;
  `};

  @media print {
    display: none;
  }
`;
const Centered = styled.div`
  text-align: center;
`;
