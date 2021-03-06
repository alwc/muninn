#!/usr/bin/env node

const envPaths = require("env-paths");
const fs = require("fs");
const mkdirp = require("mkdirp");
const path = require("path");
const yargs = require("yargs");
const { spawn } = require("child_process");

const backlinks = require("./backlinks");
const createCache = require("./utils/cache");
const getAsset = require("./get-asset");
const serveUI = require("./ui");
const tasks = require("./tasks");

const CONFIG_PATH = envPaths("muninn").config;
const CONFIG_FILE = path.join(CONFIG_PATH, "config.json");
const DEFAULT_CONFIG = {};

mkdirp(CONFIG_PATH);

const args = yargs
  .command("config", "open configuration file")
  .command("tasks", "find tasks for specified timespan", yargs => {
    yargs.option("days", {
      default: undefined,
      type: "number",
      describe: "how many days in the future to look for"
    });

    yargs.option("overdue", {
      default: true,
      type: "boolean",
      describe: "show overdue tasks"
    });

    yargs.option("vim", {
      default: false,
      type: "boolean",
      describe: "format output for vim"
    });
  })
  .command("backlinks", "find all notes related to given file", yargs => {
    yargs.option("file", {
      demandOption: true,
      describe: "input file to search for backlinks"
    });

    yargs.option("vim", {
      default: false,
      type: "boolean",
      describe: "format output for vim"
    });
  })
  .command(
    "get-asset",
    "downloads asset and returns markdown embed/link",
    yargs => {
      yargs
        .option("url", { demandOption: true, describe: "url to asset" })
        .option("file", {
          demandOption: true,
          describe: "file where the asset will be added"
        });
    }
  )
  .command("ui", "start web based ui", yargs => {
    yargs.option("port", { default: 8080 });
  })
  .command("clear-cache", "clear cache, will be rebuilt on next command")
  .demandCommand(1, "you need to provide a command")
  .help().argv;

const [TYPE] = args._;

const loadConfig = () => {
  let config;

  try {
    config = require(CONFIG_FILE);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }

  return config;
};

const COMMANDS = {
  config: () => {
    const editor = process.env.EDITOR || "vim";

    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(
        JSON.stringify(DEFAULT_CONFIG, null, 2),
        CONFIG_FILE,
        "utf-8"
      );
    }

    spawn(editor, [CONFIG_FILE], { stdio: "inherit" });
  },

  tasks: () => {
    const config = loadConfig();
    const cache = createCache(config.dir);

    cache.parse();

    tasks({
      files: cache.getFiles(),
      overdue: args.overdue,
      days: args.days,
      vim: args.vim
    });

    cache.store();
  },

  backlinks: () => {
    const config = loadConfig();
    const cache = createCache(config.dir);

    cache.parse();

    backlinks({
      files: cache.getFiles(),
      file: args.file.replace(config.dir, ""),
      vim: args.vim
    });

    cache.store();
  },

  ui: () => {
    const config = loadConfig();
    const cache = createCache(config.dir);

    serveUI({
      cache,
      dir: config.dir,
      port: args.port
    });
  },

  "get-asset": () => {
    const config = loadConfig();

    getAsset({
      dir: config.dir,
      file: args.file,
      url: args.url
    });
  },

  "clear-cache": () => {
    const config = loadConfig();
    const cache = createCache(config.dir);
    cache.clear();
  }
};

COMMANDS[TYPE]();
