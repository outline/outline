import type {
  onDisconnectPayload,
  Extension,
  connectedPayload,
  onLoadDocumentPayload,
} from "@hocuspocus/server";
import Metrics from "@server/logging/Metrics";
import type { withContext } from "./types";

export default class MetricsExtension implements Extension {
  async onLoadDocument({ instance }: withContext<onLoadDocumentPayload>) {
    Metrics.increment("collaboration.load_document");
    Metrics.gaugePerInstance(
      "collaboration.documents_count",
      instance.getDocumentsCount()
    );
  }

  onAuthenticationFailed() {
    Metrics.increment("collaboration.authentication_failed");
  }

  async connected({ instance }: withContext<connectedPayload>) {
    Metrics.increment("collaboration.connect");
    Metrics.gaugePerInstance(
      "collaboration.connections_count",
      instance.getConnectionsCount() + 1
    );
    Metrics.gaugePerInstance(
      "collaboration.documents_count",
      instance.getDocumentsCount()
    );
  }

  async onDisconnect({ instance }: withContext<onDisconnectPayload>) {
    Metrics.increment("collaboration.disconnect");
    Metrics.gaugePerInstance(
      "collaboration.connections_count",
      instance.getConnectionsCount()
    );
    Metrics.gaugePerInstance(
      "collaboration.documents_count",
      instance.getDocumentsCount()
    );
  }

  async onStoreDocument() {
    Metrics.increment("collaboration.change");
  }

  async onDestroy() {
    Metrics.gaugePerInstance("collaboration.connections_count", 0);
    Metrics.gaugePerInstance("collaboration.documents_count", 0);
  }
}
