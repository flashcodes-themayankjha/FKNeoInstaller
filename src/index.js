#!/usr/bin/env node
import { startBanner } from "../src/core/banner.js";
import { startRepl } from "../src/core/repl.js";
import { authenticateUser } from "../src/core/auth.js";
import * as config from "../src/utils/config.js";

(async () => {
  const username = config.getConfig("github.username");
  await startBanner(username);

  if (!username) {
    await authenticateUser();
  }

  await startRepl();
})();
