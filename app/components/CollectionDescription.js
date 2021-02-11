// @flow
import { observer } from "mobx-react";
import { transparentize } from "polished";
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
  const { collections, ui, policies } = useStores();
  const { t } = useTranslation();
  const [isEditing, setEditing] = React.useState(false);
  const [isDirty, setDirty] = React.useState(false);
  const can = policies.abilities(collection.id);

  const handleStartEditing = React.useCallback(() => {
    setEditing(true);
  }, []);

  const handleStopEditing = React.useCallback(() => {
    setEditing(false);
  }, []);

  const handleSave = useDebouncedCallback(async (getValue) => {
    try {
      await collection.save({
        description: getValue(),
      });
      setDirty(false);
    } catch (err) {
      ui.showToast(
        t("Sorry, an error occurred saving the collection", {
          type: "error",
        })
      );
      throw err;
    }
  }, 1000);

  const handleChange = React.useCallback(
    (getValue) => {
      handleSave(getValue);
      setDirty(true);
    },
    [handleSave]
  );

  React.useEffect(() => {
    setEditing(false);
  }, [collection.id]);

  const placeholder = `${t("Add description")}…`;

  return (
    <Input
      $isEditable={can.update}
      $isEditing={isEditing}
      onClick={can.update ? handleStartEditing : undefined}
    >
      {collections.isSaving && <LoadingIndicator />}
      {(collection.hasDescription || isEditing) && (
        <React.Suspense fallback={<Placeholder>Loading…</Placeholder>}>
          <Editor
            id={collection.id}
            key={isEditing || isDirty ? "draft" : collection.updatedAt}
            defaultValue={collection.description}
            onChange={handleChange}
            placeholder={placeholder}
            readOnly={!isEditing}
            autoFocus={isEditing}
            onFocus={handleStartEditing}
            onBlur={handleStopEditing}
            maxLength={1000}
            disableEmbeds
            readOnlyWriteCheckboxes
            grow
          />
        </React.Suspense>
      )}
      {!collection.hasDescription && can.update && !isEditing && (
        <Placeholder>{placeholder}</Placeholder>
      )}
    </Input>
  );
}

const Placeholder = styled(ButtonLink)`
  color: ${(props) => props.theme.placeholder};
`;

const Input = styled.div`
  margin: -8px;
  padding: 8px;
  border-radius: 8px;
  position: relative;
  min-height: 44px;
  max-height: 25vh;
  overflow: hidden;
  cursor: ${(props) => (props.$isEditable ? "text" : "default")};
  transition: ${(props) => props.theme.backgroundTransition};
  background: ${(props) =>
    props.$isEditing ? props.theme.secondaryBackground : "transparent"};

  &:after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 50px;
    pointer-events: none;
    background: linear-gradient(
      180deg,
      ${(props) => transparentize(1, props.theme.background)} 0%,
      ${(props) => props.theme.background} 100%
    );
  }

  &:focus,
  &:focus-within {
    max-height: initial;
    overflow: initial;
    background: ${(props) => props.theme.secondaryBackground};

    &:after {
      background: transparent;
    }
  }
`;

export default observer(CollectionDescription);
