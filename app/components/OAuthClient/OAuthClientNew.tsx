import { observer } from "mobx-react";
import * as React from "react";
import { toast } from "sonner";
import useStores from "~/hooks/useStores";
import { OAuthClientForm, FormData } from "./OAuthClientForm";

type Props = {
  onSubmit: () => void;
};

export const OAuthClientNew = observer(function OAuthClientNew_({
  onSubmit,
}: Props) {
  const { oauthClients } = useStores();
  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        await oauthClients.save(data);
        onSubmit?.();
      } catch (error) {
        toast.error(error.message);
      }
    },
    [oauthClients, onSubmit]
  );

  return <OAuthClientForm handleSubmit={handleSubmit} />;
});
