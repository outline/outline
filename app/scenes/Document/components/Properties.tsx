import { isEmail, isPhoneNumber } from "class-validator";
import { observer } from "mobx-react";
import { CloseIcon, EditIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { Primitive } from "utility-types";
import Flex from "@shared/components/Flex";
import {
  DataAttributeDataType,
  DocumentDataAttribute,
} from "@shared/models/types";
import { s } from "@shared/styles";
import { isUrl } from "@shared/utils/urls";
import Document from "~/models/Document";
import { Inner } from "~/components/Button";
import Input from "~/components/Input";
import InputSelect from "~/components/InputSelect";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import Tooltip from "~/components/Tooltip";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { DataAttributesHelper } from "~/utils/DataAttributesHelper";

const PropertyHeight = 30;

type Props = {
  document: Document;
};

export type PropertiesRef = {
  addProperty: (dataAttributeId: string) => void;
};

export const Properties = observer(
  React.forwardRef(function Properties_({ document }: Props, ref) {
    const { dataAttributes } = useStores();
    const team = useCurrentTeam();
    const can = usePolicy(document);
    const canTeam = usePolicy(team);
    const [draftAttribute, setDraftAttribute] =
      React.useState<DocumentDataAttribute | null>(null);

    const handleAddProperty = (dataAttributeId: string) => {
      setDraftAttribute((state) =>
        state
          ? null
          : {
              value: "",
              dataAttributeId,
              updatedAt: new Date().toISOString(),
            }
      );
    };

    React.useImperativeHandle(ref, () => ({
      addProperty: handleAddProperty,
    }));

    const saveOrToast = async () => {
      try {
        await document.save();
      } catch (error) {
        toast.error(error.message);
      }
    };

    const handleSave = async (dataAttribute: DocumentDataAttribute) => {
      if (dataAttribute) {
        document.setDataAttribute(
          dataAttribute.dataAttributeId,
          dataAttribute.value
        );
        await saveOrToast();
      }
    };

    if (!canTeam.listDataAttribute) {
      return null;
    }

    if ((document.dataAttributes ?? []).length === 0 && !draftAttribute) {
      return null;
    }

    return (
      <List>
        {dataAttributes.orderedData.map((definition) => {
          const dataAttribute = document.dataAttributes?.find(
            (da) => da.dataAttributeId === definition.id
          );
          if (!dataAttribute) {
            return null;
          }
          return (
            <Property
              key={dataAttribute.dataAttributeId}
              dataAttribute={dataAttribute}
              canUpdate={can.update}
              onChange={(value) => {
                document.setDataAttribute(dataAttribute.dataAttributeId, value);
              }}
              onSubmit={() => {
                void saveOrToast();
              }}
              onRemove={() => {
                document.deleteDataAttribute(dataAttribute.dataAttributeId);
                void saveOrToast();
              }}
            />
          );
        })}
        {draftAttribute && (
          <Property
            key={draftAttribute.dataAttributeId}
            dataAttribute={draftAttribute}
            canUpdate={can.update}
            onChange={(value) => {
              setDraftAttribute({
                ...draftAttribute,
                value,
              });
            }}
            onRemove={() => setDraftAttribute(null)}
            onSubmit={(value) => {
              setDraftAttribute(null);
              void handleSave({
                ...draftAttribute,
                value,
              });
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
  canUpdate,
  onChange,
  onSubmit,
  onRemove,
  ...props
}: {
  dataAttribute: DocumentDataAttribute;
  canUpdate: boolean;
  isEditing?: boolean;
  onChange: (value: Primitive) => void;
  onSubmit: (value: Primitive) => void;
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

  const handleSubmit = (newValue: Primitive) => {
    setIsEditing(false);
    onSubmit(newValue);
  };

  const inputId = `data-attribute-${dataAttribute.dataAttributeId}`;
  const displayedInput = isEditing ? (
    <>
      {definition?.dataType === DataAttributeDataType.List ? (
        <StyledInputSelect
          id={inputId}
          placeholder={t("Select an option")}
          ariaLabel={definition.name}
          options={
            definition.options?.options?.map((option) => ({
              label: option.value,
              value: option.value,
            })) ?? []
          }
          value={String(dataAttribute.value) ?? ""}
          onChange={(val) => {
            onChange(val);
            handleSubmit(val);
          }}
        />
      ) : definition?.dataType === DataAttributeDataType.Boolean ? (
        <StyledInputSelect
          id={inputId}
          ariaLabel={definition.name}
          placeholder={t("Select an option")}
          options={[
            { label: t("Yes"), value: "true" },
            { label: t("No"), value: "false" },
          ]}
          value={
            dataAttribute.value === true
              ? "true"
              : dataAttribute.value === false
              ? "false"
              : ""
          }
          onChange={(val) => {
            onChange(val);
            handleSubmit(val);
          }}
        />
      ) : (
        <StyledInput
          id={inputId}
          labelHidden
          margin={0}
          onBlur={(event) => handleSubmit(event.currentTarget.value)}
          onRequestSubmit={(event) => handleSubmit(event.currentTarget.value)}
          placeholder={definition.description ?? ""}
          value={String(dataAttribute.value) ?? ""}
          pattern={
            definition
              ? DataAttributesHelper.getValidationRegex(definition)?.source
              : undefined
          }
          required
          onChange={(event) => onChange(event.currentTarget.value)}
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
        {canUpdate && (
          <Actions align="center">
            {!isEditing && (
              <Tooltip content={t("Edit")} delay={500}>
                <HoverButton onClick={() => setIsEditing(true)}>
                  <EditIcon size={18} />
                </HoverButton>
              </Tooltip>
            )}
            <Tooltip content={t("Remove")} delay={500}>
              <HoverButton onClick={onRemove} $isEditing={isEditing}>
                <CloseIcon size={18} />
              </HoverButton>
            </Tooltip>
          </Actions>
        )}
      </Dd>
    </React.Fragment>
  );
});

const Actions = styled(Flex)`
  display: flex;
  margin-left: 8px;
`;

const Label = styled.label`
  white-space: nowrap;
`;

const HoverButton = styled(NudeButton)<{ $isEditing?: boolean }>`
  opacity: ${(props) => (props.$isEditing ? 1 : 0)};
  margin-left: -4px;

  &:hover,
  &:focus {
    color: ${s("text")};
  }
`;

const StyledInputSelect = styled(InputSelect)`
  padding: 0;
  margin: -4px;
  margin-right: 8px;
  height: ${PropertyHeight}px;

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
  margin-bottom: 1.6em;
  font-size: 14px;
  position: relative;
`;

const Dd = styled(Text)`
  flex-basis: 70%;
  display: flex;
  align-items: center;
  margin: 0;
  height: ${PropertyHeight}px;
  gap: 4px;

  &:hover {
    ${HoverButton} {
      opacity: 1;
    }
  }
`;

const Dt = styled(Text)`
  float: left;
  clear: left;
  flex-basis: 30%;
  margin: 0;
  height: ${PropertyHeight}px;

  svg {
    position: relative;
    top: 4px;
    margin-right: 4px;
  }

  &:hover + ${Dd} {
    ${HoverButton} {
      opacity: 1;
    }
  }
`;
