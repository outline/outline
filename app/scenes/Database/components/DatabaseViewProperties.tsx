import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { DataView, Property } from "@shared/types";
import Button from "~/components/Button";
import Switch from "~/components/Switch";
import useOnClickOutside from "~/hooks/useOnClickOutside";

type Props = {
  /** The collection's data schema. */
  schema: Property[];
  /** The active saved view holding the visibility overrides, if any. */
  view?: DataView;
  /** Callback when a property's visibility is toggled. */
  onToggle: (propertyId: string, visible: boolean) => void;
};

/**
 * A toolbar popover listing the schema's properties with a visibility
 * toggle for each, controlling which properties the active database view
 * displays.
 */
function DatabaseViewProperties({ schema, view, onToggle }: Props) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useOnClickOutside(containerRef, () => setIsOpen(false));

  const hidden = new Set(
    (view?.columns ?? [])
      .filter((column) => !column.visible)
      .map((column) => column.propertyId)
  );

  return (
    <Container ref={containerRef}>
      <Button type="button" onClick={() => setIsOpen(!isOpen)} neutral>
        {t("Properties")}
      </Button>
      {isOpen && (
        <Panel>
          {schema.map((property) => (
            <PanelRow key={property.id}>
              <Switch
                label={property.name}
                labelPosition="right"
                checked={!hidden.has(property.id)}
                onChange={(checked) => onToggle(property.id, checked)}
                inForm={false}
              />
            </PanelRow>
          ))}
        </Panel>
      )}
    </Container>
  );
}

const Container = styled.div`
  position: relative;
`;

const Panel = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 100;
  min-width: 220px;
  max-height: 320px;
  overflow-y: auto;
  background: ${s("menuBackground")};
  border: 1px solid ${s("divider")};
  border-radius: 8px;
  box-shadow: ${s("menuShadow")};
  padding: 8px 12px;
`;

const PanelRow = styled.div`
  padding: 4px 0;
`;

export default observer(DatabaseViewProperties);
