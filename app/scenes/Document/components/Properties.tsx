import { isEmail, isPhoneNumber } from "class-validator";
import { observer } from "mobx-react";
import { CloseIcon, EditIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Primitive } from "utility-types";
import {
  DataAttributeDataType,
  DocumentDataAttribute,
} from "@shared/models/types";
import { isUrl } from "@shared/utils/urls";
import Document from "~/models/Document";
import { Inner } from "~/components/Button";
import ButtonSmall from "~/components/ButtonSmall";
import Input from "~/components/Input";
import InputSelect from "~/components/InputSelect";
import NudeButton from "~/components/NudeButton";
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
    const [draftAttribute, setDraftAttribute] =
      React.useState<DocumentDataAttribute | null>(null);

    const handleAddProperty = (dataAttributeId: string) =>
      setDraftAttribute((state) =>
        state
          ? null
          : {
              value: "",
              dataAttributeId,
              updatedAt: new Date().toISOString(),
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

    return (
      <List>
        {document.dataAttributes?.map((dataAttribute) => (
          <Property
            key={dataAttribute.dataAttributeId}
            dataAttribute={dataAttribute}
            onChange={(value) => {
              document.setDataAttribute(dataAttribute.dataAttributeId, value);
            }}
            onSubmit={() => {
              void document.save();
            }}
            onRemove={() => {
              document.deleteDataAttribute(dataAttribute.dataAttributeId);
              void document.save();
            }}
          />
        ))}
        {draftAttribute && (
          <Property
            key={draftAttribute.dataAttributeId}
            dataAttribute={draftAttribute}
            onChange={(value) => {
              setDraftAttribute({
                ...draftAttribute,
                value,
              });
            }}
            onRemove={() => setDraftAttribute(null)}
            onSubmit={() => {
              setDraftAttribute(null);
              void handleSave();
            }}
            isEditing
          />
        )}
      </List>
    );
  })
);

const Property = observer(function Property_({
  dataAttribute,
  onChange,
  onSubmit,
  onRemove,
  ...props
}: {
  dataAttribute: DocumentDataAttribute;
  isEditing?: boolean;
  onChange: (value: Primitive) => void;
  onSubmit: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const { dataAttributes } = useStores();
  const [isEditing, setIsEditing] = React.useState(props.isEditing ?? false);
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
  ) : dataAttribute.value === true ? (
    t("Yes")
  ) : dataAttribute.value === false ? (
    t("No")
  ) : (
    value
  );

  const handleSubmit = () => {
    setIsEditing(false);
    onSubmit();
  };

  const inputId = `data-attribute-${dataAttribute.dataAttributeId}`;
  const displayedInput = isEditing ? (
    <>
      {definition?.dataType === DataAttributeDataType.List ? (
        <StyledInputSelect
          id={inputId}
          ariaLabel={definition.name}
          options={
            definition.options?.options?.map((option) => ({
              label: option.value,
              value: option.value,
            })) ?? []
          }
          value={String(dataAttribute?.value) ?? ""}
          onChange={onChange}
        />
      ) : definition?.dataType === DataAttributeDataType.Boolean ? (
        <StyledInputSelect
          id={inputId}
          ariaLabel={definition.name}
          options={[
            { label: t("Yes"), value: "true" },
            { label: t("No"), value: "false" },
          ]}
          value={dataAttribute?.value ? "true" : "false"}
          onChange={onChange}
        />
      ) : (
        <StyledInput
          id={inputId}
          labelHidden
          margin={0}
          onRequestSubmit={handleSubmit}
          placeholder={definition.description ?? ""}
          value={String(dataAttribute?.value) ?? ""}
          pattern={
            definition
              ? DataAttributesHelper.getValidationRegex(definition)?.source
              : undefined
          }
          required
          onChange={(event) => onChange(event.target.value)}
          autoFocus
        />
      )}
    </>
  ) : null;

  return (
    <React.Fragment key={dataAttribute.dataAttributeId}>
      <Dt type="tertiary" weight="bold" as="dt">
        <Label htmlFor={inputId}>
          {definition
            ? DataAttributesHelper.getIcon(
                definition.dataType,
                definition.name,
                {
                  size: 18,
                }
              )
            : null}
          {definition?.name}
        </Label>
      </Dt>
      <Dd type="tertiary" as="dd">
        {displayedInput ?? displayedValue}
        {isEditing ? (
          <ButtonSmall onClick={handleSubmit} neutral>
            {t("Save")}
          </ButtonSmall>
        ) : (
          <>
            <Tooltip content={t("Edit")} delay={500}>
              <HoverButton
                onClick={() => setIsEditing(true)}
                $isEditing={isEditing}
              >
                <EditIcon size={18} />
              </HoverButton>
            </Tooltip>
            <Tooltip content={t("Remove")} delay={500}>
              <HoverButton onClick={onRemove} $isEditing={isEditing}>
                <CloseIcon size={18} />
              </HoverButton>
            </Tooltip>
          </>
        )}
      </Dd>
    </React.Fragment>
  );
});

const Label = styled.label`
  white-space: nowrap;
`;

const HoverButton = styled(NudeButton)<{ $isEditing: boolean }>`
  opacity: ${(props) => (props.$isEditing ? 1 : 0)};
`;

const StyledInputSelect = styled(InputSelect)`
  padding: 0;
  margin: -4px;
  margin-right: 8px;
  height: 26px;

  ${Inner} {
    line-height: 14px;
    min-height: auto;
  }
`;

const StyledInput = styled(Input)`
  padding: 0;
  margin: -4px;
  margin-right: 4px;

  input {
    padding: 4px 8px;
    height: 24px;
  }
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
  height: 26px;

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
    ${HoverButton} {
      opacity: 1;
    }
  }
`;
