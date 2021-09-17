// @flow
import Metrics from "../logging/metrics";

let count = 0;

export default class Tracing {
  async onCreateDocument({ documentName }: { documentName: string }) {
    Metrics.increment("collaboration.create_document", { documentName });

    // TODO: Waiting for `instance` available in payload
    // Metrics.gaugePerInstance(
    //   "collaboration.documents_count",
    //   instance.documents.size()
    // );
  }

  async onAuthenticationFailed({ documentName }: { documentName: string }) {
    Metrics.increment("collaboration.authentication_failed", { documentName });
  }

  async onConnect({ documentName }: { documentName: string }) {
    Metrics.increment("collaboration.connect", { documentName });
    Metrics.gaugePerInstance("collaboration.connections_count", ++count);
  }

  async onDisconnect({ documentName }: { documentName: string }) {
    Metrics.increment("collaboration.disconnect", { documentName });
    Metrics.gaugePerInstance("collaboration.connections_count", --count);

    // TODO: Waiting for `instance` available in payload
    // Metrics.gaugePerInstance(
    //   "collaboration.documents_count",
    //   instance.documents.size()
    // );
  }

  async onChange({ documentName }: { documentName: string }) {
    Metrics.increment("collaboration.change", { documentName });
  }
}
