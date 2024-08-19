import { zodResolver } from "@hookform/resolvers/zod";
import { observer } from "mobx-react";
import React from "react";
import { useForm } from "react-hook-form";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Input from "~/components/Input";
import Text from "~/components/Text";
import { MattermostClient } from "../../utils/mattermost";
import {
  serverData as zodServerInfo,
  ServerData,
  UserAndTeamsData,
} from "../../utils/types";
import useDictionary from "../../utils/useDictionary";

type Props = {
  serverData: ServerData;
  setServerData: (data: ServerData) => void;
  setUserAndTeams: (userAndTeams: UserAndTeamsData) => void;
};

const ServerDetailsForm = ({
  serverData,
  setServerData,
  setUserAndTeams,
}: Props) => {
  const { t } = useTranslation();
  const dictionary = useDictionary();

  const { register, formState, handleSubmit } = useForm<ServerData>({
    mode: "all",
    defaultValues: {
      url: serverData.url,
      apiKey: serverData.apiKey,
    },
    resolver: zodResolver(zodServerInfo),
  });

  const fetchUserAndTeams = React.useCallback(async (data: ServerData) => {
    setServerData(data);
    try {
      const mattermost = new MattermostClient({
        serverUrl: data.url,
        apiKey: data.apiKey,
        dictionary,
      });
      const [userData, teamsData] = await Promise.all([
        mattermost.getUserData(),
        mattermost.getUserTeams(),
      ]);
      setUserAndTeams({ user: userData, teams: teamsData });
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  return (
    <form onSubmit={handleSubmit(fetchUserAndTeams)}>
      <Text as="p" type="secondary">
        <Trans>
          Provide the URL where the Mattermost server is hosted and the API key
          of the account which will be used to perform actions on Mattermost.
        </Trans>
      </Text>
      <Input
        type="text"
        label={t("Server URL")}
        placeholder={t("Server URL")}
        autoComplete="off"
        autoFocus
        {...register("url")}
      />
      <Input
        type="text"
        label={t("API key")}
        placeholder={t("API key")}
        autoComplete="off"
        autoFocus
        {...register("apiKey")}
      />
      <Flex justify="flex-end">
        <Button
          type="submit"
          disabled={formState.isSubmitting || !formState.isValid}
        >
          {formState.isSubmitting
            ? `${t("Fetching teams")}…`
            : t("Choose team")}
        </Button>
      </Flex>
    </form>
  );
};

export default observer(ServerDetailsForm);
