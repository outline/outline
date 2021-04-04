// @flow
import { debounce } from "lodash";
import { observer } from "mobx-react";
import { EmailIcon } from "outline-icons";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import AuthLogo from "components/AuthLogo";
import CenteredContent from "components/CenteredContent";
import Checkbox from "components/Checkbox";
import HelpText from "components/HelpText";
import List from "components/List";
import ListItem from "components/List/Item";
import PageTitle from "components/PageTitle";
import Subheading from "components/Subheading";
import useCurrentTeam from "hooks/useCurrentTeam";
import useStores from "hooks/useStores";

function Security() {
  const team = useCurrentTeam();
  const { ui, auth, authenticationProviders } = useStores();
  const { t } = useTranslation();

  React.useEffect(() => {
    authenticationProviders.fetchPage();
  }, [authenticationProviders]);

  const showSuccessMessage = React.useCallback(
    debounce(() => {
      ui.showToast(t("Settings saved"), { type: "success" });
    }, 500),
    [ui, t]
  );

  const handleChange = React.useCallback(
    async (ev: SyntheticInputEvent<>) => {
      switch (ev.target.name) {
        case "sharing":
          team.sharing = ev.target.checked;
          break;
        case "documentEmbeds":
          team.documentEmbeds = ev.target.checked;
          break;
        case "guestSignin":
          team.guestSignin = ev.target.checked;
          break;
        default:
      }

      await auth.updateTeam({
        sharing: team.sharing,
        documentEmbeds: team.documentEmbeds,
        guestSignin: team.guestSignin,
      });
      showSuccessMessage();
    },
    [auth, showSuccessMessage, team]
  );

  return (
    <CenteredContent>
      <PageTitle title={t("Security")} />
      <h1>{t("Security")}</h1>
      <HelpText>
        <Trans>
          Settings that impact the access, security, and content of your
          knowledge base.
        </Trans>
      </HelpText>

      <Checkbox
        label={t("Allow email authentication")}
        name="guestSignin"
        checked={team.guestSignin}
        onChange={handleChange}
        note={t("When enabled, users can sign-in using their email address")}
      />
      <Checkbox
        label={t("Public document sharing")}
        name="sharing"
        checked={team.sharing}
        onChange={handleChange}
        note={t(
          "When enabled, documents can be shared publicly on the internet by any team member"
        )}
      />
      <Checkbox
        label={t("Rich service embeds")}
        name="documentEmbeds"
        checked={team.documentEmbeds}
        onChange={handleChange}
        note={t(
          "Links to supported services are shown as rich embeds within your documents"
        )}
      />

      <Subheading>{t("Authentication providers")}</Subheading>
      <List>
        <ListItem
          title={t("Email")}
          subtitle={t("Users can sign-in using their email address")}
          image={<EmailIcon fill="currentColor" />}
        />

        {authenticationProviders.orderedData.map((authenticationProvider) => (
          <ListItem
            title={authenticationProvider.name}
            subtitle={authenticationProvider.providerId}
            image={
              <AuthLogo
                providerName={authenticationProvider.name}
                fill="currentColor"
              />
            }
          />
        ))}
      </List>
    </CenteredContent>
  );
}

export default observer(Security);
