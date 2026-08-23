CREATE EXTENSION IF NOT EXISTS btree_gist;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_no_overlap"
	EXCLUDE USING gist (
		"facility_id" WITH =,
		"type" WITH =,
		tstzrange("starts_at", "ends_at") WITH &&
	)
	WHERE ("status" <> 'canceled');
