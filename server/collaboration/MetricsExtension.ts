import {
  onChangePayload,
  onDisconnectPayload,
  onLoadDocumentPayload,
  Extension,
  connectedPayload,
} from "@hocuspocus/server";
import Metrics from "@server/logging/Metrics";
import { withContext } from "./types";

export default class MetricsExtension implements Extension {
  async onLoadDocument({
    documentName,
    instance,
  }: withContext<onLoadDocumentPayload>) {
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

  async connected({ documentName, instance }: withContext<connectedPayload>) {
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

  async onDisconnect({
    documentName,
    instance,
  }: withContext<onDisconnectPayload>) {
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

  async onStoreDocument({ documentName }: withContext<onChangePayload>) {
    Metrics.increment("collaboration.change", {
      documentName,
    });
  }

  async onDestroy() {
    Metrics.gaugePerInstance("collaboration.connections_count", 0);
    Metrics.gaugePerInstance("collaboration.documents_count", 0);
  }
}
