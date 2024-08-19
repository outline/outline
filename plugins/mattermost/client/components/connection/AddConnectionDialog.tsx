import { observer } from "mobx-react";
import React, { useRef, useState } from "react";
import { ServerData, UserAndTeamsData } from "../../utils/types";
import ServerDetailsForm from "./ServerDetailsForm";
import TeamSelection from "./TeamSelection";

type Props = {
  onSubmit: () => void;
};

const ConnectForm = ({ onSubmit }: Props) => {
  const [userAndTeams, setUserAndTeams] = useState<UserAndTeamsData>();
  const serverDataRef = useRef<ServerData>({
    url: "",
    apiKey: "",
  });

  return userAndTeams ? (
    <TeamSelection
      serverData={serverDataRef.current}
      userAndTeams={userAndTeams}
      onSave={onSubmit}
      onBack={() => setUserAndTeams(undefined)}
    />
  ) : (
    <ServerDetailsForm
      serverData={serverDataRef.current}
      setServerData={(data: ServerData) => (serverDataRef.current = data)}
      setUserAndTeams={setUserAndTeams}
    />
  );
};

export default observer(ConnectForm);
