function toSnake(s: string): string {
	return s.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export function mapRow<T>(row: Record<string, unknown>): T {
	const out: Record<string, unknown> = {};
	for (const key of Object.keys(row)) {
		out[toSnake(key)] = row[key];
	}
	return out as T;
}

export function mapRows<T>(rows: Record<string, unknown>[]): T[] {
	return rows.map((r) => mapRow<T>(r));
}
