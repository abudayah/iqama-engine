"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEED_EFFECTIVE_FROM = void 0;
exports.seedIqamaRules = seedIqamaRules;
const iqama_rules_seed_1 = require("./iqama-rules.seed");
exports.SEED_EFFECTIVE_FROM = '2026-11-13';
async function seedIqamaRules(prisma, effectiveFrom = exports.SEED_EFFECTIVE_FROM) {
    if ((await prisma.iqamaRuleVersion.count()) > 0)
        return false;
    await prisma.iqamaRuleVersion.create({
        data: {
            effectiveFrom,
            settings: JSON.stringify(iqama_rules_seed_1.DEFAULT_RULE_SET),
            createdBy: 'seed',
            reason: 'Initial rules',
        },
    });
    return true;
}
//# sourceMappingURL=iqama-rules.seed-db.js.map