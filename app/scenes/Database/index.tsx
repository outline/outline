import { observer } from "mobx-react";
import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { toError } from "@shared/utils/error";
import { errToString } from "@shared/utils/error";
import { toast } from "sonner";
import { DatabaseValidation } from "@shared/validations";
import type Database from "~/models/Database";
import CenteredContent from "~/components/CenteredContent";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import PlaceholderList from "~/components/List/Placeholder";
import PlaceholderText from "~/components/PlaceholderText";
import Scene from "~/components/Scene";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { NotFoundError } from "~/utils/errors";
import Error404 from "../Errors/Error404";
import DatabaseView from "./components/DatabaseView";

/**
 * The page for a single database, reached from the collection it belongs to.
 */
const DatabaseScene = observer(function DatabaseScene_() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { databases, collections } = useStores();
  const [error, setError] = useState<Error>();

  const database = databases.get(id);

  useEffect(() => {
    async function load() {
      if (!database) {
        try {
          await databases.fetch(id);
        } catch (err) {
          setError(toError(err));
        }
      }
    }
    void load();
  }, [databases, id, database]);

  useEffect(() => {
    if (database?.collectionId && !collections.get(database.collectionId)) {
      void collections.fetch(database.collectionId);
    }
  }, [collections, database?.collectionId]);

  if (error instanceof NotFoundError) {
    return <Error404 />;
  }

  return (
    <Scene title={database?.name} centered={false}>
      <CenteredContent withStickyHeader>
        {database ? (
          <>
            <Flex align="center" gap={8}>
              <DatabaseHeading database={database} />
            </Flex>
            {database.collection && (
              <Subtitle>
                {t("In {{ collectionName }}", {
                  collectionName: database.collection.name,
                })}
              </Subtitle>
            )}
            <DatabaseView database={database} />
          </>
        ) : (
          <>
            <Heading>
              <PlaceholderText height={30} />
            </Heading>
            <PlaceholderList count={5} />
          </>
        )}
      </CenteredContent>
    </Scene>
  );
});

/**
 * The database's name as a heading that switches to an input on click, so
 * renaming works the same way as renaming a document — click and type.
 */
const DatabaseHeading = observer(function DatabaseHeading_({
  database,
}: {
  database: Database;
}) {
  const { t } = useTranslation();
  const can = usePolicy(database);
  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState(database.name);

  const handleStartEditing = React.useCallback(() => {
    setValue(database.name);
    setIsEditing(true);
  }, [database.name]);

  const handleCommit = React.useCallback(async () => {
    const name = value.trim();
    setIsEditing(false);
    if (!name || name === database.name) {
      return;
    }
    try {
      await database.save({ name });
    } catch (err) {
      toast.error(errToString(err));
    }
  }, [database, value]);

  const handleKeyDown = React.useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      if (ev.nativeEvent.isComposing) {
        return;
      }
      if (ev.key === "Enter") {
        ev.preventDefault();
        void handleCommit();
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        setValue(database.name);
        setIsEditing(false);
      }
    },
    [handleCommit, database.name]
  );

  return (
    <FullWidthHeading>
      {isEditing ? (
        <HeadingInput
          type="text"
          value={value}
          placeholder={t("Untitled")}
          maxLength={DatabaseValidation.maxNameLength}
          onChange={(ev) => setValue(ev.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => void handleCommit()}
          autoFocus
        />
      ) : (
        <HeadingText
          onClick={can.update ? handleStartEditing : undefined}
          $editable={can.update}
          title={can.update ? t("Click to rename") : undefined}
        >
          {database.name}
        </HeadingText>
      )}
    </FullWidthHeading>
  );
});

const FullWidthHeading = styled(Heading)`
  flex-grow: 1;
`;

const HeadingText = styled.span<{ $editable: boolean }>`
  ${(props) => (props.$editable ? "cursor: text;" : "")}
`;

const HeadingInput = styled.input`
  border: 0;
  outline: none;
  background: none;
  color: ${s("text")};
  font: inherit;
  line-height: inherit;
  width: 100%;
  padding: 0;
  margin: 0;

  &::placeholder {
    color: ${s("placeholder")};
  }
`;

const Subtitle = styled.p`
  color: ${s("textTertiary")};
  font-size: 14px;
  margin: -8px 0 4px;
`;

export default DatabaseScene;
