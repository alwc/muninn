const LRU = require("lru-cache");
const envPaths = require("env-paths");
const fs = require("fs");
const glob = require("glob");
const mkdirp = require("mkdirp");
const path = require("path");

const { parseMarkdown, withoutParents } = require("../markdown");

const CACHE_PATH = envPaths("muninn").cache;
const CACHE_FILE = path.join(CACHE_PATH, "cache.json");

const createCache = () => {
  const cache = new LRU({
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  if (!fs.existsSync(CACHE_PATH)) {
    mkdirp(CACHE_PATH);
  }

  let cachedData;

  if (fs.existsSync(CACHE_FILE)) {
    try {
      // cachedData = require(CACHE_FILE);
      cachedData = JSON.parse(fs.readFileSync(CACHE_FILE), "utf-8");
    } catch (e) {
      console.error(e);
    }
  }

  if (cachedData) {
    cache.load(cachedData);
  }

  const store = () => {
    const cacheData = cache.dump().map(d => {
      d.v.mdast = withoutParents(d.v.mdast);
      return d;
    });

    const json = JSON.stringify(cacheData);

    fs.writeFileSync(CACHE_FILE, json, { encoding: "utf-8" });
  };

  const clear = () => {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
    }
  };

  return { cache, store, clear };
};

module.exports = dir => {
  const { cache, store, clear } = createCache();

  const parseFiles = dir => {
    const files = glob.sync("**/*.md", { cwd: dir });

    return files.reduce((memo, file) => {
      const fullPath = path.join(dir, file);
      const mtimeMs = fs.statSync(fullPath).mtimeMs;
      const cached = cache.get(fullPath) || {};

      let mdast, content;

      if (cached.mtimeMs !== mtimeMs) {
        content = fs.readFileSync(fullPath, { encoding: "utf-8" });
        mdast = parseMarkdown(content);

        cache.set(fullPath, { mtimeMs, mdast, content });
      } else {
        mdast = cached.mdast;
        content = cached.content;
      }

      memo[file] = { content, mdast };

      return memo;
    }, {});
  };

  let files = {};

  const parse = () => {
    files = parseFiles(dir);
  };

  return {
    parse,
    store,
    clear,

    getFiles: () => files // not sure why just putting `files: files` here doesn't work
  };
};
