import { z } from "zod";
import {
  COMPANY_STATUSES,
  COMPANY_MAX_CONCURRENT_AGENT_RUNS_MIN,
  COMPANY_MAX_CONCURRENT_AGENT_RUNS_MAX,
  COMPANY_MAX_CONCURRENT_AGENT_RUNS_URGENT,
  ISSUE_THREAD_INTERACTION_RESOLVER_POLICIES,
} from "../constants.js";
import { objectWithoutDefaults } from "./partial.js";

const logoAssetIdSchema = z.string().guid().nullable().optional();
const feedbackDataSharingTermsVersionSchema = z.string().min(1).nullable().optional();

const interactionResolverKindGovernanceSchema = z.object({
  defaultPolicy: z.enum(ISSUE_THREAD_INTERACTION_RESOLVER_POLICIES).optional(),
  cap: z.enum(ISSUE_THREAD_INTERACTION_RESOLVER_POLICIES).optional(),
}).strict();

export const interactionResolverGovernanceSchema = z.object({
  suggest_tasks: interactionResolverKindGovernanceSchema.optional(),
  ask_user_questions: interactionResolverKindGovernanceSchema.optional(),
  request_confirmation: interactionResolverKindGovernanceSchema.optional(),
  request_checkbox_confirmation: interactionResolverKindGovernanceSchema.optional(),
  request_item_verdicts: interactionResolverKindGovernanceSchema.optional(),
}).strict().default({});

export const createCompanySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  budgetMonthlyCents: z.number().int().nonnegative().optional().default(0),
  defaultResponsibleUserId: z.string().min(1).nullable().optional(),
});

export type CreateCompany = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = objectWithoutDefaults(
  createCompanySchema
    .partial()
    .extend({
      status: z.enum(COMPANY_STATUSES).optional(),
      spentMonthlyCents: z.number().int().nonnegative().optional(),
      requireBoardApprovalForNewAgents: z.boolean().optional(),
      maxConcurrentAgentRuns: z
        .number()
        .int()
        .min(COMPANY_MAX_CONCURRENT_AGENT_RUNS_MIN)
        .max(COMPANY_MAX_CONCURRENT_AGENT_RUNS_MAX)
        .optional(),
      maxConcurrentAgentRunsJustification: z.string().trim().max(2000).nullable().optional(),
      interactionResolverGovernance: interactionResolverGovernanceSchema.optional(),
      feedbackDataSharingEnabled: z.boolean().optional(),
      feedbackDataSharingConsentAt: z.coerce.date().nullable().optional(),
      feedbackDataSharingConsentByUserId: z.string().min(1).nullable().optional(),
      feedbackDataSharingTermsVersion: feedbackDataSharingTermsVersionSchema,
      logoAssetId: logoAssetIdSchema,
    }),
).superRefine((value, ctx) => {
  if (
    value.maxConcurrentAgentRuns !== undefined
    && value.maxConcurrentAgentRuns >= COMPANY_MAX_CONCURRENT_AGENT_RUNS_URGENT
    && !value.maxConcurrentAgentRunsJustification
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxConcurrentAgentRunsJustification"],
      message: `Raising the concurrency cap to ${COMPANY_MAX_CONCURRENT_AGENT_RUNS_URGENT} requires a recorded justification.`,
    });
  }
});

export type UpdateCompany = z.infer<typeof updateCompanySchema>;

export const updateCompanyBrandingSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    logoAssetId: logoAssetIdSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined
      || value.description !== undefined
      || value.logoAssetId !== undefined,
    "At least one branding field must be provided",
  );

export type UpdateCompanyBranding = z.infer<typeof updateCompanyBrandingSchema>;
