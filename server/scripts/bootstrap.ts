if (process.env.NODE_ENV !== "test") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config({
    silent: true,
  });
}

// @ts-expect-error ts-migrate(2322) FIXME: Type 'true' is not assignable to type 'string | un... Remove this comment to see the full error message
process.env.SINGLE_RUN = true;

export {};
