import { CaretDownIcon, CaretUpIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import scrollIntoView from "scroll-into-view-if-needed";
import styled from "styled-components";
import { s } from "@shared/styles";
import { Separator } from "~/components/Actions";
import NudeButton from "~/components/NudeButton";

type Props = {
  revisionHtml: string;
  addSeparator: boolean;
};

const RevisionNavigator = (props: Props) => {
  const { revisionHtml, addSeparator } = props;
  const [opValues, setOpValues] = React.useState<number[]>([]);
  const [opValuesSelect, setOpValuesSelect] = React.useState<number>(-1);
  const history = useHistory();
  const { t } = useTranslation();
  const total = opValues.length;

  React.useEffect(() => {
    // Collect unique "data-operation-index" values as 'opValues'
    const opValues: number[] = [];
    const all = window.document.querySelectorAll("[data-operation-index]");
    all.forEach((e) => {
      const index = parseInt(e.getAttribute("data-operation-index") || "");
      if (!isNaN(index) && !opValues.includes(index)) {
        opValues.push(index);
      }
    });
    setOpValues(opValues);

    // Clear params for simplicity
    const url = new URL(window.location.href);
    url.searchParams.delete("opIndex");
    history.replace(url.pathname + url.search);
  }, [revisionHtml]);

  const handleNav = React.useCallback(
    (dir: number) => {
      setOpValuesSelect((prevSelect) => {
        // Update selection (wrapped, covers both directions)
        let m = prevSelect === -1 && dir < 0 ? 0 : prevSelect;
        m = (m + dir + opValues.length) % opValues.length;

        // Jump to first element of 'data-operation-index=m'
        const attr = "data-operation-index";
        const value = opValues[m];
        const target = window.document.querySelector(`[${attr}="${value}"]`);

        if (target) {
          scrollIntoView(target, {
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }

        // Add to params for other UI to participate
        const url = new URL(window.location.href);
        url.searchParams.set("opIndex", value.toString());
        history.replace(url.pathname + url.search);

        return m;
      });
    },
    [opValues]
  );

  return total !== 0 ? (
    <>
      <Container>
        <span>
          {opValuesSelect === -1 &&
            t("Total {{ count }} edit", { count: total })}
          {opValuesSelect !== -1 &&
            t("Edit {{ i }} of {{ total }}", { i: opValuesSelect + 1, total })}
        </span>
        <Button onClick={() => handleNav(-1)}>
          <CaretUpIcon />
        </Button>
        <Button onClick={() => handleNav(+1)}>
          <CaretDownIcon />
        </Button>
      </Container>
      {addSeparator && <Separator />}
    </>
  ) : null;
};

const Container = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  background: ${s("background")};
`;

const Button = styled(NudeButton)`
  width: 40px;
  height: 32px;
  border: 1px solid ${s("inputBorder")};
  padding: 4px;

  &:hover {
    background: ${s("sidebarControlHoverBackground")};
  }

  &:disabled {
    color: ${s("textTertiary")};
    background: none;
    cursor: default;
  }
`;

export default RevisionNavigator;
