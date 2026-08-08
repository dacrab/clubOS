import { z } from "zod";
import type { CurrencyCode, DateFormat, TimeFormat } from "$lib/config/settings";
import type { BookingDetails } from "$lib/types/database";
import { DB_ACTIONS } from "$lib/types/database";

export const MemberRoleSchema = z.enum(["owner", "admin", "manager", "staff"]);

export const BookingTypeSchema = z.enum(["birthday", "football", "event", "other"]);

export const BookingStatusSchema = z.enum([
	"pending",
	"confirmed",
	"canceled",
	"completed",
	"no_show",
]);

const IsoDateSchema = z
	.string()
	.refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date string" });

export const BookingIdSchema = z.string().uuid();

export const PlanIdSchema = z.enum(["basic", "pro", "enterprise"]);

export const DbActionSchema = z.enum(DB_ACTIONS);

export const DbRequestSchema = z.object({
	action: DbActionSchema,
	data: z.record(z.string(), z.unknown()).optional(),
	filter: z.record(z.string(), z.unknown()).optional(),
});

export const BookingConflictFilterSchema = z
	.object({
		type: BookingTypeSchema.optional(),
		startsAt: z.string().optional(),
		endsAt: z.string().optional(),
		excludeId: z.string().optional(),
	})
	.passthrough();

export const RegisterSessionCloseFilterSchema = z.object({
	sessionId: z.string().min(1),
	closingCash: z.number().optional(),
	notes: z.string().nullable().optional(),
});

export const OrderCreateFilterSchema = z.object({
	sessionId: z.string().min(1),
	items: z
		.array(
			z.object({
				productId: z.string().min(1),
				productName: z.string().min(1),
				quantity: z.number().int().positive(),
				unitPrice: z.number(),
				lineTotal: z.number(),
				isTreat: z.boolean().optional(),
			}),
		)
		.min(1),
	couponCount: z.number().int().min(0).optional(),
	couponValue: z.number().min(0).optional(),
});

const ProductFormSchema = z
	.object({
		name: z.string().min(1),
		description: z.string().nullable().optional(),
		price: z.number().min(0),
		stock_quantity: z.number().int().min(0).optional(),
		category_id: z.string().nullable().optional(),
		image_url: z.string().nullable().optional(),
	})
	.transform((v) => ({
		name: v.name,
		description: v.description ?? null,
		price: v.price,
		stockQuantity: v.stock_quantity ?? 0,
		categoryId: v.category_id ?? null,
		imageUrl: v.image_url ?? null,
	}));

const CategoryFormSchema = z
	.object({
		name: z.string().min(1),
		description: z.string().nullable().optional(),
		parent_id: z.string().nullable().optional(),
	})
	.transform((v) => ({
		name: v.name,
		description: v.description ?? null,
		parentId: v.parent_id ?? null,
	}));

const BookingFormSchema = z
	.object({
		type: BookingTypeSchema,
		customer_name: z.string().min(1),
		customer_phone: z.string().nullable().optional(),
		customer_email: z.string().nullable().optional(),
		starts_at: IsoDateSchema,
		ends_at: IsoDateSchema,
		status: BookingStatusSchema.optional(),
		notes: z.string().nullable().optional(),
		details: z.custom<BookingDetails>().optional(),
	})
	.transform((v) => ({
		type: v.type,
		customerName: v.customer_name,
		customerPhone: v.customer_phone || null,
		customerEmail: v.customer_email || null,
		startsAt: new Date(v.starts_at),
		endsAt: new Date(v.ends_at),
		status: v.status,
		notes: v.notes || null,
		details: v.details ?? {},
	}));

const RegisterSessionOpenSchema = z
	.object({
		opening_cash: z.number().min(0).optional(),
		opened_at: IsoDateSchema.optional(),
	})
	.transform((v) => ({
		openingCash: v.opening_cash ?? 0,
		...(v.opened_at ? { openedAt: new Date(v.opened_at) } : {}),
	}));

export { BookingFormSchema, CategoryFormSchema, ProductFormSchema, RegisterSessionOpenSchema };

export const CheckoutBodySchema = z.object({
	planId: PlanIdSchema,
});

export const BookingConfirmBodySchema = z.object({
	id: BookingIdSchema,
});

export const BookingRemindBodySchema = z.object({
	id: BookingIdSchema,
});

export const OnboardingBodySchema = z.object({
	tenant: z.object({
		name: z.string().min(1, "Tenant name is required"),
		slug: z.string().optional(),
	}),
	facility: z.object({
		name: z.string().min(1, "Facility name is required"),
		address: z.string().optional(),
		phone: z.string().optional(),
		email: z.string().email().optional().or(z.literal("")),
		timezone: z.string().optional(),
	}),
	createTrial: z.boolean().optional(),
});

export const TenantSettingsSchema = z
	.object({
		currency_code: z.enum<[CurrencyCode, ...CurrencyCode[]]>([
			"EUR",
			"USD",
			"GBP",
			"CHF",
			"PLN",
			"CZK",
			"SEK",
			"NOK",
			"DKK",
		]),
		date_format: z.enum<[DateFormat, ...DateFormat[]]>([
			"DD/MM/YYYY",
			"MM/DD/YYYY",
			"YYYY-MM-DD",
			"DD.MM.YYYY",
			"DD-MM-YYYY",
		]),
		time_format: z.enum<[TimeFormat, ...TimeFormat[]]>(["24h", "12h"]),
		low_stock_threshold: z.number(),
		coupons_value: z.number(),
		football_fields_count: z.number(),
		appointment_buffer_min: z.number(),
		prevent_overlaps: z.boolean(),
		birthday_duration_min: z.number(),
		football_duration_min: z.number(),
	})
	.partial()
	.passthrough();

export const AdminUserCreateSchema = z.object({
	email: z.string().email(),
	full_name: z.string().min(1),
	password: z.string().min(6),
	role: MemberRoleSchema,
});

export const AdminUserUpdateSchema = z.object({
	id: z.string(),
	full_name: z.string().optional(),
	role: MemberRoleSchema.optional(),
	password: z.string().optional(),
});

export const AdminUserDeleteSchema = z.object({
	id: z.string().min(1),
});
