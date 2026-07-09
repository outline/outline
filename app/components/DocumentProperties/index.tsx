import { observer } from "mobx-react";
import * as React from "react";
import { toast } from "sonner";
import styled from "styled-components";
import { s } from "@shared/styles";
import type { PropertyValue } from "@shared/types";
import { PropertyType, TeamPreference } from "@shared/types";
import { errToString } from "@shared/utils/error";
import type Document from "~/models/Document";
import Text from "~/components/Text";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import PropertyValueEditor from "./PropertyValueEditor";

type Props = {
  /** The document whose properties to display and edit. */
  document: Document;
};

/**
 * A panel of typed property fields shown at the top of a document when it
 * belongs to a database collection. Edits persist through documents.update.
 */
function DocumentProperties({ document }: Props) {
  const team = useCurrentTeam();
  const { collections, users } = useStores();
  const can = usePolicy(document);

  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const schema = collection?.dataSchema;

  const hasPersonProperty = !!schema?.some(
    (property) => property.type === PropertyType.Person
  );

  React.useEffect(() => {
    if (hasPersonProperty && !users.isLoaded) {
      void users.fetchPage({ limit: 100 });
    }
  }, [hasPersonProperty, users]);

  if (!team.getPreference(TeamPreference.DocumentDatabases)) {
    return null;
  }

  if (!schema || schema.length === 0) {
    return null;
  }

  const handleChange = async (
    propertyId: string,
    value: PropertyValue | null
  ) => {
    try {
      await document.setProperty(propertyId, value);
    } catch (error) {
      toast.error(errToString(error));
    }
  };

  return (
    <Panel>
      {schema.map((property) => (
        <Row key={property.id}>
          <Name type="secondary" ellipsis>
            {property.name}
          </Name>
          <Value>
            <PropertyValueEditor
              property={property}
              value={document.propertyValue(property.id)}
              onChange={(value) => handleChange(property.id, value)}
              readOnly={!can.update}
            />
          </Value>
        </Row>
      ))}
    </Panel>
  );
}

const Panel = styled.div`
  margin: -16px 0 20px;
  border-bottom: 1px solid ${s("divider")};
  padding-bottom: 12px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  min-height: 32px;
  gap: 8px;
`;

const Name = styled(Text)`
  flex-shrink: 0;
  width: 140px;
  font-size: 14px;
`;

const Value = styled.div`
  flex-grow: 1;
  min-width: 0;
  display: flex;
  align-items: center;
`;

export default observer(DocumentProperties);
