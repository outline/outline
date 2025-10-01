import { WarningIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { DocumentValidation } from "@shared/validations";
import type Document from "~/models/Document";
import Fade from "~/components/Fade";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import { ProsemirrorHelper } from "~/models/helpers/ProsemirrorHelper";

type Props = {
  document: Document;
};

export const SizeWarning = ({ document }: Props) => {
  const { t } = useTranslation();
  const length = ProsemirrorHelper.toPlainText(document).length;

  if (length < DocumentValidation.maxRecommendedLength) {
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
