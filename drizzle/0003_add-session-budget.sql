ALTER TABLE "shopping_sessions" ADD COLUMN "budget_amount" numeric(19, 2);--> statement-breakpoint
ALTER TABLE "shopping_sessions" ADD COLUMN "currency" varchar(3) DEFAULT 'ARS' NOT NULL;