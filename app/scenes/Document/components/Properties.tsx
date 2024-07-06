import { isEmail, isPhoneNumber } from "class-validator";
import { observer } from "mobx-react";
import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { Primitive } from "utility-types";
import Flex from "@shared/components/Flex";
import {
  DataAttributeDataType,
  DocumentDataAttribute,
} from "@shared/models/types";
import { isUrl } from "@shared/utils/urls";
import Document from "~/models/Document";
import Input from "~/components/Input";
import InputSelect from "~/components/InputSelect";
import NudeButton from "~/components/NudeButton";
import Switch from "~/components/Switch";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import { DataAttributesHelper } from "~/utils/DataAttributesHelper";
import { Feature, FeatureFlags } from "~/utils/FeatureFlags";

type Props = {
  document: Document;
};

export type PropertiesRef = {
  addProperty: (dataAttributeId: string) => void;
};

export const Properties = observer(
  React.forwardRef(function Properties_({ document }: Props, ref) {
    const { dataAttributes } = useStores();
    const [draftAttribute, setDraftAttribute] = React.useState<{
      dataAttributeId: string;
      value: Primitive;
    } | null>(null);

    const handleAddProperty = (dataAttributeId: string) =>
      setDraftAttribute((state) =>
        state
          ? null
          : {
              value: "",
              dataAttributeId,
            }
      );

    React.useImperativeHandle(ref, () => ({
      addProperty: handleAddProperty,
    }));

    const handleSave = async () => {
      if (draftAttribute?.value) {
        document.setDataAttribute(
          draftAttribute.dataAttributeId,
          draftAttribute.value
        );
        await document.save();
      }
    };

    if (!FeatureFlags.isEnabled(Feature.dataAttributes)) {
      return null;
    }

    const definition = dataAttributes.get(draftAttribute?.dataAttributeId);

    return (
      <List>
        {document.dataAttributes?.map((dataAttribute) => (
          <Property
            key={dataAttribute.dataAttributeId}
            dataAttribute={dataAttribute}
            document={document}
          />
        ))}
        {draftAttribute && (
          <Flex gap={8} auto>
            {definition.name}
            {definition.dataType === DataAttributeDataType.List ? (
              <InputSelect
                required
                ariaLabel={definition.name}
                options={definition.options?.options.map((option) => ({
                  label: option.value,
                  value: option.value,
                }))}
                value={draftAttribute?.value ?? ""}
                onChange={(event) => {
                  if (event) {
                    setDraftAttribute({
                      ...draftAttribute,
                      value: event,
                    });
                    handleSave();
                  }
                }}
              />
            ) : definition.dataType === DataAttributeDataType.Boolean ? (
              <Switch
                checked={!!draftAttribute?.value}
                onChange={(event) => {
                  setDraftAttribute({
                    ...draftAttribute,
                    value: event.currentTarget.checked,
                  });
                  handleSave();
                }}
              />
            ) : (
              <Input
                value={draftAttribute?.value ?? ""}
                onBlur={handleSave}
                pattern={DataAttributesHelper.getValidationRegex(definition)}
                required
                onChange={(event) =>
                  setDraftAttribute({
                    ...draftAttribute,
                    value: event.target.value,
                  })
                }
                autoFocus
              />
            )}
          </Flex>
        )}
      </List>
    );
  })
);

const Property = observer(function Property_({
  document,
  dataAttribute,
}: {
  document: Document;
  dataAttribute: DocumentDataAttribute;
}) {
  const { t } = useTranslation();
  const { dataAttributes } = useStores();
  const definition = dataAttributes.get(dataAttribute.dataAttributeId);
  const value = String(dataAttribute.value);

  if (!definition) {
    return null;
  }

  const displayedValue = isUrl(value) ? (
    <a href={value} target="_blank" rel="noopener noreferrer">
      {value.replace(/^https?:\/\//, "")}
    </a>
  ) : isEmail(value) ? (
    <a href={`mailto:${value}`} target="_blank" rel="noopener noreferrer">
      {value}
    </a>
  ) : isPhoneNumber(value) ? (
    <a href={`tel:${value}`} target="_blank" rel="noopener noreferrer">
      {value}
    </a>
  ) : (
    value
  );

  return (
    <React.Fragment key={dataAttribute.dataAttributeId}>
      <Dt type="tertiary" weight="bold" as="dt">
        {definition
          ? DataAttributesHelper.getIcon(definition.dataType, definition.name, {
              size: 18,
            })
          : null}
        {definition?.name}
      </Dt>
      <Dd type="tertiary" as="dd">
        {displayedValue}
        <Tooltip content={t("Remove")} delay={500}>
          <RemoveButton
            onClick={() => {
              document.deleteDataAttribute(dataAttribute.dataAttributeId);
              void document.save();
            }}
          >
            <CloseIcon size={18} />
          </RemoveButton>
        </Tooltip>
      </Dd>
    </React.Fragment>
  );
});

const RemoveButton = styled(NudeButton)`
  opacity: 0;
`;

const List = styled.dl`
  display: flex;
  flex-flow: row wrap;
  margin-top: -1.4em;
  margin-bottom: 2em;
  font-size: 14px;
  position: relative;
`;

const Dt = styled(Text)`
  float: left;
  clear: left;
  flex-basis: 20%;
  margin-bottom: 2px;

  svg {
    position: relative;
    top: 4px;
    margin-right: 4px;
  }
`;

const Dd = styled(Text)`
  flex-basis: 70%;
  display: flex;
  align-items: center;
  margin-bottom: 2px;

  &:hover {
    ${RemoveButton} {
      opacity: 1;
    }
  }
`;

const InlineLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  color: ${(props) => props.theme.textSecondary};
`;
