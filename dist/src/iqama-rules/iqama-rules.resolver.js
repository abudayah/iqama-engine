"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IqamaRulesError = exports.parseCutover = exports.DEFAULT_IQAMA_RULES_CUTOVER = void 0;
exports.parseIqamaRulesMode = parseIqamaRulesMode;
exports.resolveRuleVersion = resolveRuleVersion;
exports.loadRuleSet = loadRuleSet;
const common_1 = require("@nestjs/common");
var iqama_rules_cutover_1 = require("./iqama-rules.cutover");
Object.defineProperty(exports, "DEFAULT_IQAMA_RULES_CUTOVER", { enumerable: true, get: function () { return iqama_rules_cutover_1.DEFAULT_IQAMA_RULES_CUTOVER; } });
Object.defineProperty(exports, "parseCutover", { enumerable: true, get: function () { return iqama_rules_cutover_1.parseCutover; } });
const iqama_rules_validator_1 = require("./iqama-rules.validator");
function parseIqamaRulesMode(v) {
    return v === 'shadow' || v === 'db' ? v : 'legacy';
}
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
    return best;
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