// @flow
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Collection from "models/Collection";
import ButtonLink from "components/ButtonLink";
import Editor from "components/Editor";
import useDebouncedCallback from "hooks/useDebouncedCallback";
import useStores from "hooks/useStores";

type Props = {|
  collection: Collection,
|};

function CollectionDescription({ collection }: Props) {
  const { policies } = useStores();
  const { t } = useTranslation();
  const [isEditing, setEditing] = React.useState(false);
  const can = policies.abilities(collection.id);

  const handleStartEditing = React.useCallback(() => {
    setEditing(true);
  }, []);

  const handleStopEditing = React.useCallback(() => {
    setEditing(false);
  }, []);

  const handleChange = useDebouncedCallback((getValue) => {
    collection.save({
      description: getValue(),
    });
  }, 1000);

  const placeholder = `${t("Add description")}…`;

  return (
    <Input
      onClick={isEditing ? undefined : handleStartEditing}
      $isEditing={isEditing}
    >
      {(collection.hasDescription || isEditing) && (
        <React.Suspense fallback={<span>Loading…</span>}>
          <Editor
            id={collection.id}
            key={isEditing ? "editing" : collection.description}
            defaultValue={collection.description}
            onChange={handleChange}
            onBlur={handleStopEditing}
            placeholder={placeholder}
            readOnly={!isEditing}
            autoFocus={isEditing}
            handleDOMEvents={{
              blur: handleStopEditing,
            }}
            readOnlyWriteCheckboxes
          />
        </React.Suspense>
      )}
      {!collection.hasDescription && can.update && !isEditing && (
        <Placeholder onClick={handleStartEditing}>{placeholder}</Placeholder>
      )}
    </Input>
  );
}

const Placeholder = styled(ButtonLink)`
  color: ${(props) => props.theme.placeholder};
  min-height: 27px;
`;

const Input = styled.div`
  margin: -8px;
  padding: 8px;
  border-radius: 8px;
  background: ${(props) =>
    props.$isEditing ? props.theme.secondaryBackground : "transparent"};
`;

export default CollectionDescription;
