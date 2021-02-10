// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Collection from "models/Collection";
import ButtonLink from "components/ButtonLink";
import Editor from "components/Editor";
import LoadingIndicator from "components/LoadingIndicator";
import useDebouncedCallback from "hooks/useDebouncedCallback";
import useStores from "hooks/useStores";

type Props = {|
  collection: Collection,
|};

function CollectionDescription({ collection }: Props) {
  const timeoutRef = React.useRef();
  const { collections, policies } = useStores();
  const { t } = useTranslation();
  const [isEditing, setEditing] = React.useState(false);
  const can = policies.abilities(collection.id);

  const handleStartEditing = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setEditing(true);
  }, []);

  const handleStopEditing = React.useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setEditing(false);
    }, 1500);
  }, []);

  const handleChange = useDebouncedCallback((getValue) => {
    collection.save({
      description: getValue(),
    });
  }, 1000);

  React.useEffect(() => {
    setEditing(false);
  }, [collection.id]);

  const placeholder = `${t("Add description")}…`;

  return (
    <Input
      onClick={isEditing ? undefined : handleStartEditing}
      $isEditable={can.update}
    >
      {collections.isSaving && <LoadingIndicator />}
      {(collection.hasDescription || isEditing) && (
        <React.Suspense fallback={<Placeholder>Loading…</Placeholder>}>
          <Editor
            id={collection.id}
            key={isEditing ? collection.id : collection.description}
            defaultValue={collection.description}
            onChange={handleChange}
            placeholder={placeholder}
            readOnly={!isEditing}
            autoFocus={isEditing}
            handleDOMEvents={{
              focus: handleStartEditing,
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
`;

const Input = styled.div`
  display: flex;
  margin: -8px;
  padding: 8px;
  border-radius: 8px;
  min-height: 44px;
  cursor: ${(props) => (props.$isEditable ? "text" : "default")};
  transition: background 100ms ease-out;

  &:focus-within {
    background: ${(props) => props.theme.secondaryBackground};
  }
`;

export default observer(CollectionDescription);
