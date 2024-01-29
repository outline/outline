import { subDays } from "date-fns";
import { WebhookDelivery } from "@server/models";
import { buildWebhookDelivery } from "@server/test/factories";
import CleanupWebhookDeliveriesTask from "./CleanupWebhookDeliveriesTask";

const deliveryExists = async (delivery: WebhookDelivery) => {
  const results = await WebhookDelivery.findOne({ where: { id: delivery.id } });
  return !!results;
};

describe("CleanupWebookDeliveriesTask", () => {
  it("should delete Webhook Deliveries older than 1 week", async () => {
    const brandNewWebhookDelivery = await buildWebhookDelivery({
      createdAt: new Date(),
    });
    const newishWebhookDelivery = await buildWebhookDelivery({
      createdAt: subDays(new Date(), 5),
    });
    const oldWebhookDelivery = await buildWebhookDelivery({
      createdAt: subDays(new Date(), 8),
    });

    const task = new CleanupWebhookDeliveriesTask();
    await task.perform();

    expect(await deliveryExists(brandNewWebhookDelivery)).toBe(true);
    expect(await deliveryExists(newishWebhookDelivery)).toBe(true);
    expect(await deliveryExists(oldWebhookDelivery)).toBe(false);
  });
});
