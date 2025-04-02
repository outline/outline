import React from "react";
import CenteredContent from "~/components/CenteredContent";

function Authorize() {
  return (
    <CenteredContent>
      <form
        method="POST"
        action="/oauth/authorize"
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <input type="text" name="client_id" placeholder="Client ID" />
        <input type="text" name="client_secret" placeholder="Client Secret" />
        <input type="text" name="redirect_uri" placeholder="Redirect URI" />
        <input type="text" name="response_type" placeholder="Response Type" />
        <input type="text" name="scope" placeholder="Scope" />
        <button type="submit">Authorize</button>
      </form>
    </CenteredContent>
  );
}

export default Authorize;
