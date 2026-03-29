import env from "@server/env";

/**
 * For debugging. The connection name is based on the services running in
 * this process. Note that this does not need to be unique.
 */
export const getConnectionName = (connectionNameSuffix?: string) => {
  const connectionNamePrefix = env.isDevelopment ? process.pid : "outline";
  return (
    `${connectionNamePrefix}:${env.SERVICES.join("-")}` +
    (connectionNameSuffix ? `:${connectionNameSuffix}` : "")
  );
};
