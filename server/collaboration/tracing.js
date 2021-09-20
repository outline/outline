// @flow
import Metrics from "../logging/metrics";

export default class Tracing {
  async onCreateDocument({
    documentName,
    instance,
  }: {
    documentName: string,
    instance: any,
  }) {
    Metrics.increment("collaboration.create_document", { documentName });

    Metrics.gaugePerInstance(
      "collaboration.documents_count",
      instance.getDocumentsCount()
    );
  }

  async onAuthenticationFailed({ documentName }: { documentName: string }) {
    Metrics.increment("collaboration.authentication_failed", { documentName });
  }

  async onConnect({
    documentName,
    instance,
  }: {
    documentName: string,
    instance: any,
  }) {
    Metrics.increment("collaboration.connect", { documentName });
    Metrics.gaugePerInstance(
      "collaboration.connections_count",
      instance.getConnectionsCount()
    );
  }

  async onDisconnect({
    documentName,
    instance,
  }: {
    documentName: string,
    instance: any,
  }) {
    Metrics.increment("collaboration.disconnect", { documentName });
    Metrics.gaugePerInstance(
      "collaboration.connections_count",
      instance.getConnectionsCount()
    );

    // TODO: Waiting for `instance` available in payload
    Metrics.gaugePerInstance(
      "collaboration.documents_count",
      instance.getDocumentsCount()
    );
  }

  async onChange({ documentName }: { documentName: string }) {
    Metrics.increment("collaboration.change", { documentName });
  }
}
