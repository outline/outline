import { createQueue } from "@server/utils/queue";

export const globalEventQueue = createQueue("globalEvents");

export const processorEventQueue = createQueue("processorEvents");

export const websocketQueue = createQueue("websockets");

export const taskQueue = createQueue("tasks");
