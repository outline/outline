import { observer } from "mobx-react";
import { EyeIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { DataView, Property } from "@shared/types";
import NudeButton from "~/components/NudeButton";
import Switch from "~/components/Switch";
import Tooltip from "~/components/Tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/primitives/Popover";

type Props = {
  /** The collection's data schema. */
  schema: Property[];
  /** The active saved view holding the visibility overrides, if any. */
  view?: DataView;
  /** Callback when a property's visibility is toggled. */
  onToggle: (propertyId: string, visible: boolean) => void;
};

/**
 * An eye-icon popover listing the schema's properties with a visibility
 * toggle for each, controlling which properties the active database view
 * displays.
 */
function DatabaseViewProperties({ schema, view, onToggle }: Props) {
  const { t } = useTranslation();

  const hidden = new Set(
    (view?.columns ?? [])
      .filter((column) => !column.visible)
      .map((column) => column.propertyId)
  );

  return (
    <Popover>
      <Tooltip content={t("Visible properties")}>
        <PopoverTrigger>
          <IconButton
            type="button"
            aria-label={t("Visible properties")}
            size={24}
          >
            <EyeIcon size={18} />
          </IconButton>
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="end"
        aria-label={t("Visible properties")}
        width={220}
        shrink
      >
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
      </PopoverContent>
    </Popover>
  );
}

const IconButton = styled(NudeButton)`
  color: ${s("textSecondary")};
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background: ${s("backgroundSecondary")};
    color: ${s("text")};
  }
`;

const PanelRow = styled.div`
  padding: 4px 0;
`;

export default observer(DatabaseViewProperties);
