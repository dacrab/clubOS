import { z } from "zod";

export const productSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().default(""),
	price: z.number().min(0, "Price must be >= 0"),
	stock_quantity: z.number().int().default(0),
	category_id: z.string().default(""),
	image_url: z.string().default(""),
});

export const bookingSchema = z.object({
	customer_name: z.string().min(1, "Customer name is required"),
	customer_phone: z.string().min(1, "Phone is required"),
	starts_at: z.string().min(1, "Date/time is required"),
	notes: z.string().default(""),
	status: z.enum(["pending", "confirmed", "canceled", "completed", "no_show"]).default("confirmed"),
	num_children: z.number().int().min(0).default(1),
	num_adults: z.number().int().min(0).default(0),
	field_number: z.string().default("1"),
	num_players: z.number().int().min(1).default(10),
});

export type ProductSchema = typeof productSchema;
export type BookingSchema = typeof bookingSchema;
