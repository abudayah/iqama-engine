"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_libsql_1 = require("@prisma/adapter-libsql");
const iqama_rules_seed_db_1 = require("../src/iqama-rules/iqama-rules.seed-db");
const iqama_rules_cutover_1 = require("../src/iqama-rules/iqama-rules.cutover");
const DATABASE_URL = process.env['DATABASE_URL'] ?? 'file:./prisma/db.sqlite';
const adapter = new adapter_libsql_1.PrismaLibSql({ url: DATABASE_URL });
const prisma = new client_1.PrismaClient({ adapter });
(0, iqama_rules_seed_db_1.seedIqamaRules)(prisma, (0, iqama_rules_cutover_1.parseCutover)(process.env['IQAMA_RULES_CUTOVER']))
    .then((created) => console.log(created
    ? 'Iqama rules seeded (version 1).'
    : 'IqamaRuleVersion already seeded — skipping.'))
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed-iqama-rules.js.map