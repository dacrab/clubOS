import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, parent }) => {
	const { user } = await parent();
	const { supabase } = locals;

	const { data: settings } = await supabase
		.from("tenant_settings")
		.select("*")
		.eq("tenant_id", user.tenantId)
		.is("facility_id", null)
		.single();

	// Default settings matching the new schema
	const defaultSettings = {
		id: "",
		tenant_id: user.tenantId,
		facility_id: null,
		// Inventory settings
		low_stock_threshold: 3,
		allow_unlimited_stock: true,
		negative_stock_allowed: false,
		default_category_sort: "name",
		products_page_size: 50,
		image_max_size_mb: 5,
		// Sales settings
		coupons_value: 2,
		allow_treats: true,
		require_open_register_for_sale: true,
		currency_code: "EUR",
		tax_rate_percent: 0,
		tax_inclusive: true,
		receipt_header_text: "",
		receipt_footer_text: "",
		print_receipt_by_default: false,
		// Booking settings
		booking_default_duration_min: 120,
		football_default_duration_min: 60,
		football_fields_count: 2,
		appointment_buffer_min: 15,
		prevent_overlaps: true,
		allow_online_bookings: false,
		require_deposit: false,
		default_deposit_percent: 20,
		send_booking_reminders: false,
		reminder_hours_before: 24,
		// Appearance settings
		theme_default: "system",
		default_locale: "en",
		date_format: "DD/MM/YYYY",
		time_format: "24h",
		first_day_of_week: 1,
		// Business hours
		business_hours: {
			mon: { open: "09:00", close: "21:00" },
			tue: { open: "09:00", close: "21:00" },
			wed: { open: "09:00", close: "21:00" },
			thu: { open: "09:00", close: "21:00" },
			fri: { open: "09:00", close: "21:00" },
			sat: { open: "10:00", close: "22:00" },
			sun: { open: "10:00", close: "20:00" },
		},
	};

	return {
		settings: settings ? { ...defaultSettings, ...settings } : defaultSettings,
	};
};
