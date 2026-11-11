ALTER TABLE "companies" ADD COLUMN "max_concurrent_agent_runs" integer DEFAULT 4 NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "max_concurrent_agent_runs_justification" text;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_max_concurrent_agent_runs_bounds" CHECK ("companies"."max_concurrent_agent_runs" between 1 and 5);