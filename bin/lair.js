#!/usr/bin/env node

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// pass the target directory to the server
const target = process.argv[2] || ".";
process.argv[2] = resolve(target);

await import("../server/index.js");
