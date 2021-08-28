// @flow
import { createQueue } from "../utils/queue";

export const globalEventQueue = createQueue("globalEvents");
export const processorEventQueue = createQueue("processorEvents");
export const websocketsQueue = createQueue("websockets");
export const emailsQueue = createQueue("emails");
