import { customType } from "drizzle-orm/pg-core";

export const money = customType<{ data: number; driverData: string }>({
	dataType() {
		return "numeric(10, 2)";
	},
	toDriver(value: number): string {
		return value.toFixed(2);
	},
	fromDriver(value: string): number {
		return Number(value);
	},
});
