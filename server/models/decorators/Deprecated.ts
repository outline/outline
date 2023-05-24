/* eslint-disable @typescript-eslint/ban-types */

const Deprecated =
  (message?: string) => (target: Object, propertyKey: string) => {
    if (process.env[propertyKey]) {
      // eslint-disable-next-line no-console
      console.warn(
        `The environment variable ${propertyKey} is deprecated and will be removed in a future release. ${message}`
      );
    }
  };

export default Deprecated;
