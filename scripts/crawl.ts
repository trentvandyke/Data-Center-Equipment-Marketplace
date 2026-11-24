import { crawlSources } from "../src/lib/crawl/run";

const only = process.argv.slice(2);

crawlSources(only)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
