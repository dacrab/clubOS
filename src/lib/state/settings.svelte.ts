import type { FormatSettings } from "$lib/utils/format";
import { DEFAULT_SETTINGS, type TenantSettings } from "$lib/config/settings";

function createSettings() {
	let current = $state<TenantSettings>(DEFAULT_SETTINGS);

	return {
		get current() { return current; },
		get formatSettings(): FormatSettings {
			return {
				date_format: current.date_format,
				time_format: current.time_format,
				currency_code: current.currency_code,
			};
		},
		setSettings(newSettings: Partial<TenantSettings>) {
			current = { ...DEFAULT_SETTINGS, ...newSettings };
		},
	};
}

export const settings = createSettings();
