import { escape } from "es-toolkit/compat";
import type { Context } from "koa";

/**
 * Performs a redirect on the browser so that the user's auth cookies are
 * included in the request. Assigned to the Koa context as `redirectOnClient`.
 *
 * @param url the URL to redirect to.
 * @param method the HTTP method to use for the redirect. Use POST when
 * preventing links in emails from being clicked by bots. Otherwise, use GET.
 */
export function redirectOnClient(
  this: Context,
  url: string,
  method: "GET" | "POST" = "GET"
) {
  this.type = "text/html";

  if (method === "POST") {
    // For POST method, create a form that auto-submits
    const urlObj = new URL(url);
    const formAction = `${urlObj.origin}${urlObj.pathname}`;
    const searchParams = urlObj.searchParams;

    let formFields = "";
    searchParams.forEach((value, key) => {
      formFields += `<input type="hidden" name="${escape(
        key
      )}" value="${escape(value)}" />`;
    });

    if (this.userAgent.isBot) {
      formFields += `
          <p>If you are not redirected automatically, please click the button below.</p>
          <input type="submit" value="Continue" />
        `;
    }

    this.body = `
<html lang="en">
<head>
  <title>Redirecting…</title>
</head>
<body>
  <form id="redirect-form" method="POST" action="${formAction}">
    ${formFields}
  </form>
  <script nonce="${this.state.cspNonce}">
    ${!this.userAgent.isBot} && document.getElementById('redirect-form').submit();
  </script>
</body>
</html>`;
  } else {
    // Default GET method using meta refresh
    this.body = `
<html lang="en">
<head>
<meta http-equiv="refresh" content="0;URL='${escape(url)}'" />
</head>
</html>`;
  }
}
