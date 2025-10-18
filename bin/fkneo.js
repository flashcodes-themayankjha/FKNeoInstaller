#!/usr/bin/env node
import { startBanner } from '../src/core/banner.js';
import { startRepl } from '../src/core/repl.js';

(async () => {
  await startBanner();
  await startRepl();
})();

