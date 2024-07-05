import { isEmail, isPhoneNumber } from "class-validator";
import { observer } from "mobx-react";
import { CloseIcon, PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Flex from "@shared/components/Flex";
import { isUrl } from "@shared/utils/urls";
import Document from "~/models/Document";
import Input from "~/components/Input";
import InputSelect from "~/components/InputSelect";
import NudeButton from "~/components/NudeButton";
import Text from "~/components/Text";
import useStores from "~/hooks/useStores";
import { DataAttributesHelper } from "~/utils/DataAttributesHelper";
import { documentPath } from "~/utils/routeHelpers";

type Props = {
  document: Document;
};

export const Properties = observer(function Properties_({ document }: Props) {
  const { dataAttributes } = useStores();
  const { t } = useTranslation();
  const [draftAttribute, setDraftAttribute] = React.useState<{
    dataAttributeId: string;
    value: string;
  } | null>(null);

  const addProperty = (
    <InlineLink
      to={documentPath(document)}
      onClick={() =>
        setDraftAttribute((state) =>
          state
            ? null
            : {
                value: "",
                dataAttributeId: dataAttributes.orderedData[0].id,
              }
        )
      }
    >
      <PlusIcon size={18} />
      &nbsp;Property
    </InlineLink>
  );

  return (
    <List>
      {document.dataAttributes?.map((dataAttribute) => {
        const definition = dataAttributes.get(dataAttribute.dataAttributeId);
        const value = String(dataAttribute.value);

        const displayedValue = isUrl(value) ? (
          <a href={value} target="_blank" rel="noopener noreferrer">
            {value}
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
                ? DataAttributesHelper.getIcon(
                    definition.dataType,
                    definition.name,
                    {
                      size: 18,
                    }
                  )
                : null}
              {definition?.name}
            </Dt>
            <Dd type="tertiary" as="dd">
              {displayedValue}
              <RemoveButton
                onClick={() => {
                  document.deleteDataAttribute(dataAttribute.dataAttributeId);
                  void document.save();
                }}
              >
                <CloseIcon size={18} />
              </RemoveButton>
            </Dd>
          </React.Fragment>
        );
      })}
      {document.dataAttributes?.length > 0 && addProperty}
      {draftAttribute && (
        <Flex gap={8} auto>
          <InputSelect
            ariaLabel="Type"
            options={dataAttributes.orderedData.map((attribute) => ({
              label:
                attribute.name +
                " – " +
                DataAttributesHelper.getName(attribute.dataType, t),
              value: attribute.id,
            }))}
            value={
              draftAttribute?.dataAttributeId ??
              dataAttributes.orderedData[0].id
            }
            onChange={(dataAttributeId) =>
              dataAttributeId &&
              setDraftAttribute({ ...draftAttribute, dataAttributeId })
            }
          />

          <Input
            placeholder="Value"
            value={draftAttribute?.value ?? ""}
            onBlur={async () => {
              if (draftAttribute.value) {
                document.setDataAttribute(
                  draftAttribute.dataAttributeId,
                  draftAttribute.value
                );
                await document.save();
              }
            }}
            onChange={(event) =>
              setDraftAttribute({
                ...draftAttribute,
                value: event.target.value,
              })
            }
          />
        </Flex>
      )}
    </List>
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

  svg {
    position: relative;
    top: 4px;
    margin-right: 4px;
  }
`;

const Dd = styled(Text)`
  flex-basis: 70%;

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
