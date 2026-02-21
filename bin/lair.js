#!/usr/bin/env node

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const target = process.argv[2] || ".";
const root = resolve(target);
const port = parseInt(process.env.PORT || "3333", 10);

const { startLair } = await import("../server/index.js");
await startLair({ root, port });
