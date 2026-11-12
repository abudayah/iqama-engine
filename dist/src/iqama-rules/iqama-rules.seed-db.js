"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedIqamaRules = seedIqamaRules;
const iqama_rules_seed_1 = require("./iqama-rules.seed");
const iqama_rules_cutover_1 = require("./iqama-rules.cutover");
async function seedIqamaRules(prisma, effectiveFrom = iqama_rules_cutover_1.DEFAULT_IQAMA_RULES_CUTOVER) {
    if ((await prisma.iqamaRuleVersion.count()) > 0)
        return false;
    await prisma.iqamaRuleVersion.create({
        data: {
            effectiveFrom,
            settings: JSON.stringify(iqama_rules_seed_1.DEFAULT_RULE_SET),
            createdBy: 'seed',
            reason: 'Initial rules (same as the legacy rules)',
        },
    });
    return true;
}
//# sourceMappingURL=iqama-rules.seed-db.js.map