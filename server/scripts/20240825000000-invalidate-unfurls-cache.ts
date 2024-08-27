import RedisAdapter from "@server/storage/redis";
import "./bootstrap";

const redis = RedisAdapter.defaultClient;

const Keys = {
  Pattern: "unfurl:*",
  Total: 0,
  Error: 0,
};

const Page = {
  Count: 0,
  Limit: 1000,
};

const deleteKeys = async (keys: string[]): Promise<void> => {
  Keys.Total += keys.length;

  const pipeline = redis.pipeline();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keys.forEach((key: any) => pipeline.del(key));

  const res = await pipeline.exec();

  if (!res) {
    Keys.Error += keys.length;
    return;
  }

  res.forEach(([err]) => {
    if (err) {
      Keys.Error++;
    }
  });
};

const execute = async () => {
  const stream = redis.scanStream({ match: Keys.Pattern, count: Page.Limit });

  console.log("Invalidating unfurls cache...");

  stream.on("data", (unfurlKeys) => {
    if (!unfurlKeys.length) {
      return;
    }

    Page.Count++;
    console.log(`Starting page ${Page.Count}...`);

    stream.pause();

    void deleteKeys(unfurlKeys).then(() => {
      console.log(`Completed page ${Page.Count}.`);
      stream.resume();
    });
  });

  stream.on("end", () => {
    console.log("Unfurls cache invalidation completed.");
    console.log(
      `\nStats\nTotal keys: ${Keys.Total}\nErrored keys: ${Keys.Error}`
    );
    process.exit(0);
  });

  stream.on("error", (err) => {
    console.log(
      `Encountered an error when invalidating unfurls cache: ${err.message}`
    );
    process.exit(1);
  });
};

void execute();
