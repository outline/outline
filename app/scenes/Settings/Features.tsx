import { observer } from "mobx-react";
import { BeakerIcon } from "outline-icons";
import { useState } from "react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Collection from "~/models/Collection";
import Heading from "~/components/Heading";
import HelpText from "~/components/HelpText";
import Scene from "~/components/Scene";
import Switch from "~/components/Switch";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useStores from "~/hooks/useStores";
import useToasts from "~/hooks/useToasts";
import PreferredCollection from "./components/PreferredCollection";

function Features() {
  const { auth, collections } = useStores();
  const team = useCurrentTeam();
  const { t } = useTranslation();
  const { showToast } = useToasts();
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState();
  const [publicCollections, setPublicCollections] = useState<Collection[]>([]);

  const [data, setData] = useState({
    collaborativeEditing: team.collaborativeEditing,
    preferredCollectionId: team.preferredCollectionId,
  });

  React.useEffect(() => {
    async function load() {
      if (publicCollections.length === 0 && !fetching && !fetchError) {
        try {
          setFetching(true);
          const publicCollections = await collections.fetchAccesibleTeam({
            limit: 100,
          });
          setPublicCollections(publicCollections);
        } catch (error) {
          showToast(
            t("Collections could not be loaded, please reload the app"),
            {
              type: "error",
            }
          );
          setFetchError(error);
        } finally {
          setFetching(false);
        }
      }
    }

    load();
  }, [
    showToast,
    fetchError,
    t,
    fetching,
    publicCollections.length,
    collections,
  ]);

  const handleDataChange = React.useCallback(
    async (newData: {
      collaborativeEditing: boolean;
      preferredCollectionId: string | null;
    }) => {
      setData(newData);
      await auth.updateTeam(newData);
      showToast(t("Settings saved"), {
        type: "success",
      });
    },
    [auth, showToast, t]
  );

  const handleChange = React.useCallback(
    async (ev: React.ChangeEvent<HTMLInputElement>) => {
      const newData = { ...data, [ev.target.name]: ev.target.checked };
      handleDataChange(newData);
    },
    [data, handleDataChange]
  );

  const onPreferredCollectionChange = React.useCallback(
    async (value: string) => {
      const newData = {
        ...data,
        preferredCollectionId: value === "home" ? null : value,
      };
      handleDataChange(newData);
    },
    [data, handleDataChange]
  );

  return (
    <Scene title={t("Features")} icon={<BeakerIcon color="currentColor" />}>
      <Heading>
        <Trans>Features</Trans>
      </Heading>
      <HelpText>
        <Trans>
          Manage optional and beta features. Changing these settings will affect
          the experience for all team members.
        </Trans>
      </HelpText>
      <Switch
        label={t("Collaborative editing")}
        name="collaborativeEditing"
        checked={data.collaborativeEditing}
        onChange={handleChange}
        note={
          <Trans>
            When enabled multiple people can edit documents at the same time
            with shared presence and live cursors.
          </Trans>
        }
      />
      <PreferredCollection
        collections={publicCollections}
        fetching={fetching}
        onPreferredCollectionChange={onPreferredCollectionChange}
        preferredCollectionId={data.preferredCollectionId}
      />
    </Scene>
  );
}

export default observer(Features);
