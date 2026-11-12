"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IqamaRulesError = void 0;
exports.resolveRuleVersion = resolveRuleVersion;
exports.loadRuleSet = loadRuleSet;
const common_1 = require("@nestjs/common");
const iqama_rules_validator_1 = require("./iqama-rules.validator");
class IqamaRulesError extends common_1.HttpException {
    code;
    issues;
    constructor(code, message, issues) {
        super({ statusCode: 500, code, message, issues }, 500);
        this.code = code;
        this.issues = issues;
    }
}
exports.IqamaRulesError = IqamaRulesError;
function resolveRuleVersion(date, versions) {
    let best;
    for (const v of versions) {
        if (v.effectiveFrom > date)
            continue;
        if (!best ||
            v.effectiveFrom > best.effectiveFrom ||
            (v.effectiveFrom === best.effectiveFrom && v.id > best.id))
            best = v;
    }
    if (best)
        return best;
    let earliest;
    for (const v of versions) {
        if (!earliest ||
            v.effectiveFrom < earliest.effectiveFrom ||
            (v.effectiveFrom === earliest.effectiveFrom && v.id < earliest.id))
            earliest = v;
    }
    return earliest;
}
function loadRuleSet(version) {
    let parsed;
    try {
        parsed = JSON.parse(version.settings);
    }
    catch {
        throw new IqamaRulesError('IQAMA_RULES_INVALID', `IqamaRuleVersion ${version.id} is not valid JSON`);
    }
    if (!parsed || typeof parsed !== 'object') {
        throw new IqamaRulesError('IQAMA_RULES_INVALID', `IqamaRuleVersion ${version.id} is not a rule set`);
    }
    const { errors } = (0, iqama_rules_validator_1.validateRuleSet)(parsed);
    if (errors.length > 0) {
        throw new IqamaRulesError('IQAMA_RULES_INVALID', `IqamaRuleVersion ${version.id} fails validation: ${errors
            .map((e) => `${e.path} ${e.message}`)
            .join('; ')}`, errors);
    }
    return parsed;
}
//# sourceMappingURL=iqama-rules.resolver.js.map