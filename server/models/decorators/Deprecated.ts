/* eslint-disable @typescript-eslint/ban-types */
import Logger from "@server/logging/Logger";

const Deprecated = (message?: string) => (
  target: Object,
  propertyKey: string
) => {
  if (process.env[propertyKey]) {
    Logger.warn(
      `The environment variable ${propertyKey} is deprecated and will be removed in a future release. ${message}`
    );
  }
};

export default Deprecated;
