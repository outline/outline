import { observer } from "mobx-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { s } from "@shared/styles";
import { toError } from "@shared/utils/error";
import CenteredContent from "~/components/CenteredContent";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import PlaceholderList from "~/components/List/Placeholder";
import PlaceholderText from "~/components/PlaceholderText";
import Scene from "~/components/Scene";
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
              <Heading>{database.name}</Heading>
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

const Subtitle = styled.p`
  color: ${s("textTertiary")};
  font-size: 14px;
  margin: -8px 0 4px;
`;

export default DatabaseScene;
