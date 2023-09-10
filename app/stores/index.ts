import RootStore from "~/stores/RootStore";
import env from "~/env";

const stores = new RootStore();

if (env.ENVIRONMENT === "development") {
  window.stores = stores;
}

export default stores;
