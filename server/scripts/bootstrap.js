// @flow
if (process.env.NODE_ENV !== "test") {
  require("dotenv").config({ silent: true });
}

process.env.SINGLE_RUN = true;
