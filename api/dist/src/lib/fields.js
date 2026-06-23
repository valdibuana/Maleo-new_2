"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFields = parseFields;
exports.selectFields = selectFields;
/**
 * Parse a comma-separated `fields` query param into an array of field names.
 * Returns null if not provided or empty.
 */
function parseFields(query) {
    const raw = query.fields;
    if (!raw || typeof raw !== "string")
        return null;
    const list = raw
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
    return list.length > 0 ? list : null;
}
/**
 * If `fields` is provided, strip each item down to only those keys.
 * Always keeps `id` if present in the original object.
 */
function selectFields(items, fields) {
    if (!fields)
        return items;
    return items.map((item) => {
        const picked = {};
        // Always include id
        if ("id" in item)
            picked.id = item.id;
        for (const key of fields) {
            if (key in item)
                picked[key] = item[key];
        }
        return picked;
    });
}
//# sourceMappingURL=fields.js.map