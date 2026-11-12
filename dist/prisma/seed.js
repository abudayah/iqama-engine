"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const path_1 = require("path");
for (const script of ['seed-adhan-config.ts', 'seed-iqama-rules.ts']) {
    (0, child_process_1.execFileSync)(process.execPath, [require.resolve('ts-node/dist/bin.js'), (0, path_1.join)(__dirname, script)], { stdio: 'inherit' });
}
//# sourceMappingURL=seed.js.map