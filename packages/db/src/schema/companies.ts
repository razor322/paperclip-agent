import type { InteractionResolverGovernance } from "@paperclipai/shared";
import { numeric, pgTable, uuid, text, integer, timestamp, boolean, jsonb, uniqueIndex, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    pauseReason: text("pause_reason"),
    pausedAt: timestamp("paused_at", { withTimezone: true }),
    issuePrefix: text("issue_prefix").notNull().default("PAP"),
    issueCounter: integer("issue_counter").notNull().default(0),
    budgetMonthlyCents: integer("budget_monthly_cents").notNull().default(0),
    spendMonthUtc: text("spend_month_utc"),
    spentMonthlyCents: numeric("spent_monthly_cents", { precision: 24, scale: 7, mode: "number" }).notNull().default(0),
    defaultResponsibleUserId: text("default_responsible_user_id"),
    requireBoardApprovalForNewAgents: boolean("require_board_approval_for_new_agents")
      .notNull()
      .default(false),
    // Company-wide ceiling on simultaneously running agent runs (AET-253:
    // 3-4 by default, 5 only with a recorded justification).
    maxConcurrentAgentRuns: integer("max_concurrent_agent_runs").notNull().default(4),
    maxConcurrentAgentRunsJustification: text("max_concurrent_agent_runs_justification"),
    interactionResolverGovernance: jsonb("interaction_resolver_governance")
      .$type<InteractionResolverGovernance>()
      .notNull()
      .default({}),
    feedbackDataSharingEnabled: boolean("feedback_data_sharing_enabled")
      .notNull()
      .default(false),
    feedbackDataSharingConsentAt: timestamp("feedback_data_sharing_consent_at", { withTimezone: true }),
    feedbackDataSharingConsentByUserId: text("feedback_data_sharing_consent_by_user_id"),
    feedbackDataSharingTermsVersion: text("feedback_data_sharing_terms_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    issuePrefixUniqueIdx: uniqueIndex("companies_issue_prefix_idx").on(table.issuePrefix),
    maxConcurrentAgentRunsBounds: check(
      "companies_max_concurrent_agent_runs_bounds",
      sql`${table.maxConcurrentAgentRuns} between 1 and 5`,
    ),
  }),
);
