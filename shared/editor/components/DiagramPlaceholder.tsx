import styled from "styled-components";
import { ComponentProps } from "../types";
import { s } from "../../styles";
import { useTranslation } from "react-i18next";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import Text from "../../components/Text";

type Props = ComponentProps & {
  /** Callback for double click event */
  onDoubleClick: () => void;
};

export const DiagramPlaceholder = ({ isSelected, onDoubleClick }: Props) => {
  const { t } = useTranslation();

  return (
    <Placeholder
      className={isSelected ? "ProseMirror-selectednode" : ""}
      onDoubleClick={onDoubleClick}
    >
      <Text size="small" type="secondary" as="p">
        {t("Empty diagram")}
      </Text>{" "}
      <Text size="small" type="tertiary" italic>
        {t("Double click to edit")}
      </Text>
    </Placeholder>
  );
};

const Placeholder = styled.div`
  border: 2px dashed ${s("inputBorder")};
  background: ${s("backgroundSecondary")};
  border-radius: ${EditorStyleHelper.blockRadius};
  padding: 16px;
  text-align: center;
  cursor: var(--pointer);
`;
