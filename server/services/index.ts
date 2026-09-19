/**
 * Services are lazily imported so that only the modules for the services
 * actually being run are loaded into memory. For example, a worker-only
 * process does not need to import the web or collaboration services and their
 * (often heavy) dependency trees.
 */
const services = {
  websockets: () => import("./websockets"),
  collaboration: () => import("./collaboration"),
  admin: () => import("./admin"),
  web: () => import("./web"),
  worker: () => import("./worker"),
  cron: () => import("./cron"),
} as const;

export default services;
