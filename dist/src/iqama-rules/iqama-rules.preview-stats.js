"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyStats = void 0;
exports.classifyDay = classifyDay;
exports.addDay = addDay;
function classifyDay(current, proposed) {
    const movedNow = current.iqama_clamped === true;
    const movedProposed = proposed.iqama_clamped === true;
    const changed = current.iqama !== proposed.iqama;
    return {
        changed,
        movedNow,
        movedProposed,
        newlyMoved: movedProposed && (!movedNow || changed),
        noLongerMoved: movedNow && !movedProposed,
    };
}
const emptyStats = () => ({
    changedDays: 0,
    movedNow: 0,
    movedProposed: 0,
    newlyMoved: 0,
    newlyMovedDates: [],
    noLongerMoved: 0,
});
exports.emptyStats = emptyStats;
function addDay(stats, date, c, maxDates) {
    if (c.changed)
        stats.changedDays++;
    if (c.movedNow)
        stats.movedNow++;
    if (c.movedProposed)
        stats.movedProposed++;
    if (c.noLongerMoved)
        stats.noLongerMoved++;
    if (c.newlyMoved) {
        stats.newlyMoved++;
        if (stats.newlyMovedDates.length < maxDates) {
            stats.newlyMovedDates.push(date);
        }
    }
}
//# sourceMappingURL=iqama-rules.preview-stats.js.map