import RootStore from "~/stores/RootStore";
import env from "~/env";

const stores = new RootStore();

// Expose stores on window in development for easier debugging
if (env.ENVIRONMENT === "development") {
  window.stores = stores;
}

export default stores;
