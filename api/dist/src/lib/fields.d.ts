/**
 * Parse a comma-separated `fields` query param into an array of field names.
 * Returns null if not provided or empty.
 */
export declare function parseFields(query: Record<string, any>): string[] | null;
/**
 * If `fields` is provided, strip each item down to only those keys.
 * Always keeps `id` if present in the original object.
 */
export declare function selectFields<T extends Record<string, any>>(items: T[], fields: string[] | null): T[];
//# sourceMappingURL=fields.d.ts.map