import { z } from "zod";

export const MemberRoleSchema = z.enum(["owner", "admin", "manager", "staff"]);

export const BookingTypeSchema = z.enum(["birthday", "football"]);

export const BookingIdSchema = z.string().uuid();

export const PlanIdSchema = z.enum(["basic", "pro", "enterprise"]);

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
	id: z.string().optional(),
	full_name: z.string().optional(),
	role: MemberRoleSchema.optional(),
	password: z.string().optional(),
});

export const AdminUserDeleteSchema = z.object({
	id: z.string().min(1),
});
