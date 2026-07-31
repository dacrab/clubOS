import type { TenantSettings } from "$lib/config/settings";
import { DEFAULT_SETTINGS } from "$lib/config/settings";

let current = $state(DEFAULT_SETTINGS);

export const settings = {
	get current() {
		return current;
	},
	setSettings(newSettings: Partial<TenantSettings>) {
		current = { ...current, ...newSettings };
	},
};
