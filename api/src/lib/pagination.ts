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
export function parsePagination(query: Record<string, any>): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(10000, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build pagination metadata object for the response.
 */
export function buildPagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
