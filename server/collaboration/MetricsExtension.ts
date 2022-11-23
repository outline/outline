import {
  onChangePayload,
  onConnectPayload,
  onDisconnectPayload,
  onLoadDocumentPayload,
  Extension,
} from "@hocuspocus/server";
import Metrics from "@server/logging/Metrics";

export default class MetricsExtension implements Extension {
  async onLoadDocument({ documentName, instance }: onLoadDocumentPayload) {
    Metrics.increment("collaboration.load_document", {
      documentName,
    });
    Metrics.gaugePerInstance(
      "collaboration.documents_count",
      instance.getDocumentsCount()
    );
  }

  onAuthenticationFailed({ documentName }: { documentName: string }) {
    Metrics.increment("collaboration.authentication_failed", {
      documentName,
    });
  }

  async onConnect({ documentName, instance }: onConnectPayload) {
    Metrics.increment("collaboration.connect", {
      documentName,
    });
    Metrics.gaugePerInstance(
      "collaboration.connections_count",
      instance.getConnectionsCount() + 1
    );
    Metrics.gaugePerInstance(
      "collaboration.documents_count",
      instance.getDocumentsCount()
    );
  }

  async onDisconnect({ documentName, instance }: onDisconnectPayload) {
    Metrics.increment("collaboration.disconnect", {
      documentName,
    });
    Metrics.gaugePerInstance(
      "collaboration.connections_count",
      instance.getConnectionsCount()
    );
    Metrics.gaugePerInstance(
      "collaboration.documents_count",
      instance.getDocumentsCount()
    );
  }

  async onStoreDocument({ documentName }: onChangePayload) {
    Metrics.increment("collaboration.change", {
      documentName,
    });
  }

  async onDestroy() {
    Metrics.gaugePerInstance("collaboration.connections_count", 0);
    Metrics.gaugePerInstance("collaboration.documents_count", 0);
  }
}
