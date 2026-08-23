ALTER TABLE "dead_letter_queue" DROP CONSTRAINT "dead_letter_queue_status_check";--> statement-breakpoint
ALTER TABLE "dead_letter_queue" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dead_letter_queue" ADD COLUMN "locked_by" text;--> statement-breakpoint
ALTER TABLE "dead_letter_queue" ADD COLUMN "next_attempt_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dead_letter_queue" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_dlq_idempotency" ON "dead_letter_queue" USING btree ("business_id","idempotency_key");--> statement-breakpoint
ALTER TABLE "dead_letter_queue" ADD CONSTRAINT "dead_letter_queue_status_check" CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'resolved'::text, 'ignored'::text]));