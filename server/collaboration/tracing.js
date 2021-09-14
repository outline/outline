// @flow
import * as metrics from "../utils/metrics";

let count = 0;

export default class Tracing {
  async onCreateDocument({ documentName }: { documentName: string }) {
    metrics.increment("collaboration.create_document", { documentName });

    // TODO: Waiting for `instance` available in payload
    // metrics.gaugePerInstance(
    //   "collaboration.documents_count",
    //   instance.documents.size()
    // );
  }

  async onAuthenticationFailed({ documentName }: { documentName: string }) {
    metrics.increment("collaboration.authentication_failed", { documentName });
  }

  async onConnect({ documentName }: { documentName: string }) {
    metrics.increment("collaboration.connect", { documentName });
    metrics.gaugePerInstance("collaboration.connections_count", ++count);
  }

  async onDisconnect({ documentName }: { documentName: string }) {
    metrics.increment("collaboration.disconnect", { documentName });
    metrics.gaugePerInstance("collaboration.connections_count", --count);

    // TODO: Waiting for `instance` available in payload
    // metrics.gaugePerInstance(
    //   "collaboration.documents_count",
    //   instance.documents.size()
    // );
  }

  async onChange({ documentName }: { documentName: string }) {
    metrics.increment("collaboration.change", { documentName });
  }
}
