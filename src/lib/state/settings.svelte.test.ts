import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unmock settings for this test file
vi.unmock('$lib/state/settings.svelte');

// Mock the config dependency
vi.mock('$lib/config/settings', () => ({
	DEFAULT_SETTINGS: {
		currency_code: 'EUR',
		date_format: 'DD/MM/YYYY',
		time_format: '24h',
		tax_rate_percent: 0,
		low_stock_threshold: 5,
		coupons_value: 0.5,
	}
}));

import { settings } from './settings.svelte';
import { DEFAULT_SETTINGS } from '$lib/config/settings';

describe('settings', () => {
	beforeEach(() => {
		settings.setSettings({});
	});

	describe('initialization', () => {
		it('has current property with default settings', () => {
			expect(settings.current).toEqual(DEFAULT_SETTINGS);
		});
	});

	describe('setSettings', () => {
		it('updates settings with partial values', () => {
			settings.setSettings({ currency_code: 'USD', tax_rate_percent: 10 });
			expect(settings.current.currency_code).toBe('USD');
			expect(settings.current.tax_rate_percent).toBe(10);
		});

		it('merges with defaults', () => {
			settings.setSettings({ low_stock_threshold: 10 });
			expect(settings.current).toEqual({ ...DEFAULT_SETTINGS, low_stock_threshold: 10 });
		});

		it('handles empty object', () => {
			settings.setSettings({});
			expect(settings.current).toEqual(DEFAULT_SETTINGS);
		});
	});

	describe('formatSettings', () => {
		it('returns format-specific settings', () => {
			expect(settings.formatSettings).toEqual({
				date_format: DEFAULT_SETTINGS.date_format,
				time_format: DEFAULT_SETTINGS.time_format,
				currency_code: DEFAULT_SETTINGS.currency_code,
			});
		});

		it('reflects changes when settings are updated', () => {
			settings.setSettings({ date_format: 'MM/DD/YYYY', currency_code: 'USD' });
			expect(settings.formatSettings.date_format).toBe('MM/DD/YYYY');
			expect(settings.formatSettings.currency_code).toBe('USD');
		});
	});
});
