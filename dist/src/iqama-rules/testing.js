"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionRow = exports.TEST_CUTOVER = exports.TEST_TZ = void 0;
exports.makeStack = makeStack;
exports.freezeDate = freezeDate;
const testing_1 = require("@nestjs/testing");
const config_1 = require("@nestjs/config");
const cache_manager_1 = require("@nestjs/cache-manager");
const adhan_adapter_1 = require("../adhan/adhan.adapter");
const qiyam_config_service_1 = require("../hijri-calendar/qiyam-config.service");
const override_service_1 = require("../override/override.service");
const prisma_service_1 = require("../prisma/prisma.service");
const rules_service_1 = require("../rules/rules.service");
const schedule_builder_service_1 = require("../schedule-builder/schedule-builder.service");
const iqama_rules_service_1 = require("./iqama-rules.service");
const iqama_rules_seed_1 = require("./iqama-rules.seed");
exports.TEST_TZ = 'Etc/GMT+7';
exports.TEST_CUTOVER = '2026-11-13';
const versionRow = (id, effectiveFrom, rules = iqama_rules_seed_1.DEFAULT_RULE_SET) => ({
    id,
    effectiveFrom,
    settings: JSON.stringify(rules),
    reason: null,
    createdBy: 'test',
    createdAt: new Date(),
});
exports.versionRow = versionRow;
async function makeStack(opts) {
    const rows = opts.rows ?? [(0, exports.versionRow)(1, exports.TEST_CUTOVER)];
    const cfg = {
        'app.masjidLatitude': 49.2652047,
        'app.masjidLongitude': -122.7878735,
        'app.masjidTimezone': exports.TEST_TZ,
        'app.iqamaRules': opts.mode,
        'app.iqamaRulesCutover': exports.TEST_CUTOVER,
    };
    const iqamaRuleVersion = {
        findMany: jest.fn(() => Promise.resolve([...rows].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.id - b.id))),
        findFirst: jest.fn(() => {
            const latest = [...rows].sort((a, b) => b.id - a.id)[0];
            return Promise.resolve(latest ? { id: latest.id } : null);
        }),
        create: jest.fn(({ data, }) => {
            const row = { id: rows.length + 1, createdAt: new Date(), ...data };
            rows.push(row);
            return Promise.resolve(row);
        }),
    };
    const prisma = {
        $queryRaw: jest.fn().mockResolvedValue([]),
        specialPrayer: { findMany: jest.fn().mockResolvedValue([]) },
        adhanConfigVersion: { findMany: jest.fn().mockResolvedValue([]) },
        adhanConfigPeriod: { findMany: jest.fn().mockResolvedValue([]) },
        iqamaRuleVersion,
    };
    const module = await testing_1.Test.createTestingModule({
        providers: [
            schedule_builder_service_1.ScheduleBuilderService,
            iqama_rules_service_1.IqamaRulesService,
            adhan_adapter_1.AdhanAdapter,
            rules_service_1.RulesService,
            override_service_1.OverrideService,
            { provide: prisma_service_1.PrismaService, useValue: prisma },
            { provide: config_1.ConfigService, useValue: { get: (k) => cfg[k] } },
            {
                provide: qiyam_config_service_1.QiyamConfigService,
                useValue: { getForYear: jest.fn().mockResolvedValue(null) },
            },
            { provide: cache_manager_1.CACHE_MANAGER, useValue: {} },
        ],
    }).compile();
    return {
        builder: module.get(schedule_builder_service_1.ScheduleBuilderService),
        service: module.get(iqama_rules_service_1.IqamaRulesService),
        prisma,
        rows,
    };
}
function freezeDate(iso) {
    jest.useFakeTimers({
        now: new Date(iso),
        doNotFake: [
            'nextTick',
            'setImmediate',
            'clearImmediate',
            'setInterval',
            'clearInterval',
            'setTimeout',
            'clearTimeout',
            'queueMicrotask',
            'performance',
            'hrtime',
        ],
    });
}
//# sourceMappingURL=testing.js.map