import { createBrowserHistory } from "history";
import env from "~/env";

const history = createBrowserHistory({
  basename: env.CONTEXT_PATH || "",
});

export default history;
