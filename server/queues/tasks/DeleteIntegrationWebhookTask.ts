import { InternalError } from "@server/errors";
import { DeleteIntegrationWebhook } from "@server/types";
import { decrypt } from "@server/utils/crypto";
import fetch from "@server/utils/fetch";
import BaseTask from "./BaseTask";

export default class DeleteIntegrationWebhookTask extends BaseTask<DeleteIntegrationWebhook> {
  public async perform({ method, url, apiKey }: DeleteIntegrationWebhook) {
    const res = await fetch(decrypt(url), {
      method,
      headers: {
        Authorization: `Bearer ${decrypt(apiKey)}`,
      },
    });

    // skip retrying auth & 'not found' errors - they would fail anyway.
    if (res.ok || (res.status >= 400 && res.status <= 404)) {
      return;
    }

    // retry in case of other transient errors.
    throw InternalError();
  }
}
