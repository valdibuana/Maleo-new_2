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
export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
}
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}
/**
 * Parse and validate page/limit from query string.
 * Defaults: page=1, limit=20, max limit=10000.
 * The high max ensures admin pages that need all data can request it.
 */
export declare function parsePagination(query: Record<string, any>): PaginationParams;
/**
 * Build pagination metadata object for the response.
 */
export declare function buildPagination(page: number, limit: number, total: number): PaginationMeta;
//# sourceMappingURL=pagination.d.ts.map