const Deprecated =
  (message?: string) => (_target: object, propertyKey: string) => {
    if (process.env[propertyKey]) {
      // oxlint-disable-next-line no-console
      console.warn(
        `The environment variable ${propertyKey} is deprecated and will be removed in a future release. ${message}`
      );
    }
  };

export default Deprecated;
