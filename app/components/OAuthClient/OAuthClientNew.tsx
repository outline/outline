import { observer } from "mobx-react";
import * as React from "react";
import { useHistory } from "react-router-dom";
import { toast } from "sonner";
import useStores from "~/hooks/useStores";
import { settingsPath } from "~/utils/routeHelpers";
import { OAuthClientForm, FormData } from "./OAuthClientForm";

type Props = {
  onSubmit: () => void;
};

export const OAuthClientNew = observer(function OAuthClientNew_({
  onSubmit,
}: Props) {
  const { oauthClients } = useStores();
  const history = useHistory();

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        const oauthClient = await oauthClients.save(data);
        onSubmit?.();
        history.push(settingsPath("applications", oauthClient.id));
      } catch (error) {
        toast.error(error.message);
      }
    },
    [oauthClients, history, onSubmit]
  );

  return <OAuthClientForm handleSubmit={handleSubmit} />;
});
