// @flow
import { createQueue } from "../utils/queue";

export const globalEventsQueue = createQueue("global events");
export const serviceEventsQueue = createQueue("service events");
export const websocketsQueue = createQueue("websocket events");
