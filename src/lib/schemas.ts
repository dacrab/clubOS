import { z } from "zod";
import { DB_ACTIONS } from "$lib/types/database";

export const MemberRoleSchema = z.enum(["owner", "admin", "manager", "staff"]);

export const BookingTypeSchema = z.enum(["birthday", "football", "event", "other"]);

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
	closingCash: z.union([z.number(), z.string()]).optional(),
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
				unitPrice: z.union([z.string(), z.number()]),
				lineTotal: z.union([z.string(), z.number()]),
				isTreat: z.boolean().optional(),
			}),
		)
		.min(1),
	couponCount: z.number().int().min(0).optional(),
	couponValue: z.number().min(0).optional(),
});

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
		currency_code: z.string(),
		date_format: z.string(),
		time_format: z.string(),
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
