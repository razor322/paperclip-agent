import { describe, expect, it } from "vitest";
import {
  createCompanySchema,
  updateCompanyBrandingSchema,
  updateCompanySchema,
} from "./company.js";
import { portabilityCompanyManifestEntrySchema } from "./company-portability.js";

describe("company schemas without the retired settings", () => {
  it("strips brandColor and attachmentMaxBytes from a create payload", () => {
    const parsed = createCompanySchema.parse({
      name: "Acme",
      brandColor: "#123456",
      attachmentMaxBytes: 25_000_000,
    });

    expect(parsed).not.toHaveProperty("brandColor");
    expect(parsed).not.toHaveProperty("attachmentMaxBytes");
    expect(parsed.name).toBe("Acme");
  });

  it("strips brandColor and attachmentMaxBytes from an update payload", () => {
    const parsed = updateCompanySchema.parse({
      description: "Updated",
      brandColor: "#123456",
      attachmentMaxBytes: 25_000_000,
    });

    expect(parsed).not.toHaveProperty("brandColor");
    expect(parsed).not.toHaveProperty("attachmentMaxBytes");
    expect(parsed.description).toBe("Updated");
  });

  it("rejects brandColor on the strict branding schema", () => {
    const result = updateCompanyBrandingSchema.safeParse({
      name: "Acme",
      brandColor: "#123456",
    });

    expect(result.success).toBe(false);
  });

  it("still accepts the remaining branding fields", () => {
    const result = updateCompanyBrandingSchema.safeParse({
      name: "Acme",
      description: null,
      logoAssetId: "11111111-1111-4111-8111-111111111111",
    });

    expect(result.success).toBe(true);
  });

  it("requires at least one branding field", () => {
    expect(updateCompanyBrandingSchema.safeParse({}).success).toBe(false);
  });
});

describe("company concurrency ceiling", () => {
  it("accepts a cap within the allowed band", () => {
    expect(updateCompanySchema.parse({ maxConcurrentAgentRuns: 4 }).maxConcurrentAgentRuns).toBe(4);
  });

  it("rejects a cap above the ceiling", () => {
    expect(updateCompanySchema.safeParse({ maxConcurrentAgentRuns: 6 }).success).toBe(false);
  });

  it("rejects a cap below the floor", () => {
    expect(updateCompanySchema.safeParse({ maxConcurrentAgentRuns: 0 }).success).toBe(false);
  });

  it("requires a justification when raising to the urgent cap", () => {
    const without = updateCompanySchema.safeParse({
      maxConcurrentAgentRuns: 5,
      maxConcurrentAgentRunsJustification: "  ",
    });
    expect(without.success).toBe(false);

    const withReason = updateCompanySchema.parse({
      maxConcurrentAgentRuns: 5,
      maxConcurrentAgentRunsJustification: "Incident bridge unblock",
    });
    expect(withReason.maxConcurrentAgentRunsJustification).toBe("Incident bridge unblock");
  });

  it("does not require a justification below the urgent cap", () => {
    const parsed = updateCompanySchema.parse({ maxConcurrentAgentRuns: 4 });
    expect(parsed.maxConcurrentAgentRuns).toBe(4);
  });
});

describe("portability company manifest tolerance", () => {
  it("accepts a legacy manifest entry carrying the retired keys and ignores them", () => {
    const parsed = portabilityCompanyManifestEntrySchema.parse({
      path: "company.md",
      name: "Acme",
      description: null,
      brandColor: "#5c5fff",
      logoPath: null,
      attachmentMaxBytes: 25_000_000,
      requireBoardApprovalForNewAgents: false,
    });

    expect(parsed).not.toHaveProperty("brandColor");
    expect(parsed).not.toHaveProperty("attachmentMaxBytes");
    expect(parsed.name).toBe("Acme");
  });
});
