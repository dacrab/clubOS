import type { TenantSettings } from "$lib/config/settings";
import { DEFAULT_SETTINGS } from "$lib/config/settings";

function createSettings() {
	let current = $state<TenantSettings>(DEFAULT_SETTINGS);

	return {
		get current() { return current; },
		setSettings(newSettings: Partial<TenantSettings>) {
			current = { ...DEFAULT_SETTINGS, ...newSettings };
		},
	};
}

export const settings = createSettings();
