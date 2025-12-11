import type { FormatSettings } from "$lib/utils/format";
import { DEFAULT_SETTINGS, type TenantSettings } from "$lib/config/settings";

export type { TenantSettings };

class SettingsState {
	current = $state<TenantSettings>({ ...DEFAULT_SETTINGS });

	setSettings(newSettings: Partial<TenantSettings>): void {
		this.current = { ...DEFAULT_SETTINGS, ...newSettings };
	}

	get formatSettings(): FormatSettings {
		return {
			date_format: this.current.date_format,
			time_format: this.current.time_format,
			currency_code: this.current.currency_code,
		};
	}
}

export const settings = new SettingsState();
