const express = require("express");
const fetch = require("node-fetch");
const morgan = require("morgan");
const yargs = require("yargs");

const argv = yargs
  .option("port", {
    alias: "p",
    type: "number",
    description: "Proxy server port",
  })
  .option("origin", {
    alias: "o",
    type: "string",
    description: "Origin server URL",
  })
  .option("clear-cache", { type: "boolean", description: "Clear cache" })
  .demandOption(
    ["port", "origin"],
    "Please provide both port and origin arguments"
  )
  .help().argv;

const app = express();
const cache = new Map();

app.use(morgan("dev"));

app.use(async (req, res) => {
  const cacheKey = req.originalUrl;

  if (cache.has(cacheKey)) {
    console.log("Cache hit for:", cacheKey);
    res.set("X-Cache", "HIT");
    return res.send(cache.get(cacheKey));
  }

  console.log("Fetching from origin:", argv.origin + cacheKey);
  try {
    const response = await fetch(argv.origin + cacheKey);
    const data = await response.text();

    cache.set(cacheKey, data);
    res.set("X-Cache", "MISS");
    res.send(data);
  } catch (error) {
    res.status(500).send("Error fetching data from origin");
  }
});

if (argv["clear-cache"]) {
  cache.clear();
  console.log("Cache cleared");
  process.exit(0);
}

app.listen(argv.port, () => {
  console.log(
    `Caching proxy server running on port ${argv.port}, forwarding to ${argv.origin}`
  );
});
