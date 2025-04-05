import { observer } from "mobx-react";
import * as React from "react";
import { toast } from "sonner";
import useStores from "~/hooks/useStores";
import { OAuthClientForm, FormData } from "./OAuthClientForm";

type Props = {
  oauthClientId: string;
  onSubmit: () => void;
};

export const OAuthClientEdit = observer(function OAuthClientEdit_({
  oauthClientId,
  onSubmit,
}: Props) {
  const { oauthClients } = useStores();
  const oauthClient = oauthClients.get(oauthClientId);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await oauthClient?.save(data);
        onSubmit?.();
      } catch (error) {
        toast.error(error.message);
      }
    },
    [oauthClient, onSubmit]
  );

  return (
    <OAuthClientForm oauthClient={oauthClient} handleSubmit={handleSubmit} />
  );
});
