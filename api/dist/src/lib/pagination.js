"use strict";
/**
 * Reusable pagination helpers for list endpoints.
 *
 * Usage in routes:
 *   const { page, limit, skip } = parsePagination(req.query);
 *   const [data, total] = await Promise.all([
 *     prisma.model.findMany({ where, skip, take: limit, ... }),
 *     prisma.model.count({ where }),
 *   ]);
 *   res.json({ success: true, data, pagination: buildPagination(page, limit, total) });
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePagination = parsePagination;
exports.buildPagination = buildPagination;
/**
 * Parse and validate page/limit from query string.
 * Defaults: page=1, limit=20, max limit=10000.
 * The high max ensures admin pages that need all data can request it.
 */
function parsePagination(query) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(10000, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
/**
 * Build pagination metadata object for the response.
 */
function buildPagination(page, limit, total) {
    return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
    };
}
//# sourceMappingURL=pagination.js.map