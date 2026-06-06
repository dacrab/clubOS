import type { TenantSettings } from "$lib/config/settings";
import { DEFAULT_SETTINGS } from "$lib/config/settings";

function createSettings(): {
	readonly current: TenantSettings;
	setSettings: (newSettings: Partial<TenantSettings>) => void;
} {
	let current = $state(DEFAULT_SETTINGS);

	return {
		get current() {
			return current;
		},
		setSettings(newSettings: Partial<TenantSettings>) {
			current = { ...current, ...newSettings };
		},
	};
}

export const settings = createSettings();
