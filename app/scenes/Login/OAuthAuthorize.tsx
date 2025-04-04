import React from "react";
import { useTranslation } from "react-i18next";
import Button from "~/components/Button";
import ChangeLanguage from "~/components/ChangeLanguage";
import TeamLogo from "~/components/TeamLogo";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useQuery from "~/hooks/useQuery";
import useRequest from "~/hooks/useRequest";
import { client } from "~/utils/ApiClient";
import { detectLanguage } from "~/utils/language";
import { Background } from "./components/Background";
import { Centered } from "./components/Centered";

function Authorize() {
  const team = useCurrentTeam();
  const params = useQuery();
  const { t } = useTranslation();
  const clientId = params.get("client_id");
  const clientSecret = params.get("client_secret");
  const redirectUri = params.get("redirect_uri");
  const responseType = params.get("response_type");
  const state = params.get("state");
  const scope = params.get("scope");
  // const [scopes] = React.useState(() => scope?.split(" ") ?? []);
  const { error, data, request } = useRequest(() =>
    client.post("/oauthClients.info", { clientId })
  );

  React.useEffect(() => {
    if (clientId) {
      void request();
    }
  }, []);

  if (error) {
    return (
      <Background>
        <ChangeLanguage locale={detectLanguage()} />
        <Centered>
          <h1>{t("Error")}</h1>
          <p>{t("Unable to load OAuth client")}</p>
        </Centered>
      </Background>
    );
  }

  if (!data) {
    // TODO
    return null;
  }

  return (
    <Background>
      <ChangeLanguage locale={detectLanguage()} />

      <Centered gap={12}>
        <TeamLogo model={team} size={24} alt={t("Logo")} /> {team.name}
        <h1>{data.data.name}</h1>
        <p>{data.data.developerName}</p>
        <p>{data.data.developerUrl}</p>
        <p>{data.data.description}</p>
        <form method="POST" action="/oauth/authorize" style={{ width: "100%" }}>
          <input type="hidden" name="client_id" value={clientId ?? ""} />
          <input
            type="hidden"
            name="client_secret"
            value={clientSecret ?? ""}
          />
          <input type="hidden" name="redirect_uri" value={redirectUri ?? ""} />
          <input
            type="hidden"
            name="response_type"
            value={responseType ?? "code"}
          />
          <input type="hidden" name="state" value={state ?? ""} />
          <input type="hidden" name="scope" value={scope ?? ""} />
          <Button type="submit" fullwidth>
            {t("Authorize")}
          </Button>
        </form>
      </Centered>
    </Background>
  );
}

export default Authorize;
