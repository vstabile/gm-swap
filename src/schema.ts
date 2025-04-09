import { z } from "zod";
import { KINDS } from "~/lib/nostr";

// Nostr Template Schema
const nostrTemplateSchema = z.object({
  kind: z.number(),
  content: z.string(),
  tags: z.array(z.array(z.string())),
  created_at: z.number(),
});

// Nostr Sig Spec Schema
const nostrSigSpecSchema = z.object({
  type: z.literal("nostr"),
  template: nostrTemplateSchema,
});

// Cashu Sig Spec Schema
const cashuSigSpecSchema = z.object({
  type: z.literal("cashu"),
  amount: z.number(),
  mint: z.array(z.string().url()),
});

// Combined Sig Spec Schema
const sigSpecSchema = z.discriminatedUnion("type", [
  nostrSigSpecSchema,
  cashuSigSpecSchema,
]);

// Content Schema
const proposalContentSchema = z.object({
  give: sigSpecSchema,
  take: sigSpecSchema,
  exp: z.number().optional(),
  role: z.enum(["adaptor", "nonce"]).optional(),
  description: z.string().optional(),
  nonce: z.string().optional(),
  enc_s: z.string().optional(),
});

// Tags Schema
const proposalTagsSchema = z.array(z.array(z.string())).refine(
  (tags) => {
    const pTag = tags.find((tag) => tag[0] === "p");
    return pTag !== undefined && /^[0-9a-f]{64}$/i.test(pTag[1]);
  },
  {
    message:
      "Must contain at least one 'p' tag with a valid 64-character hex pubkey",
  }
);

// Complete Event Schema
export const proposalEventSchema = z.object({
  kind: z.literal(KINDS.PROPOSAL),
  pubkey: z.string().length(64),
  content: z.string().transform((str) => {
    try {
      return proposalContentSchema.parse(JSON.parse(str));
    } catch (e) {
      throw new Error("Invalid content format");
    }
  }),
  tags: proposalTagsSchema,
  created_at: z.number(),
  id: z.string().length(64),
  sig: z.string().length(128),
});

// Nonce Event Content Schema
const nonceContentSchema = z.object({
  nonce: z.string(),
  enc_s: z.string().optional(),
});

// Adaptor Event Content Schema
const adaptorContentSchema = z.object({
  adaptors: z.array(
    z.object({
      sa: z.string(),
      R: z.string(),
      T: z.string(),
      Y: z.string().optional(),
    })
  ),
  cashu: z.string().optional(),
});

// Common Tags Schema for both nonce and adaptor events
const commonTagsSchema = z.array(z.array(z.string())).refine(
  (tags) => {
    const pTag = tags.find((tag) => tag[0] === "p");
    const eTag = tags.find((tag) => tag[0] === "e");
    return (
      pTag !== undefined &&
      eTag !== undefined &&
      /^[0-9a-f]{64}$/i.test(pTag[1]) &&
      /^[0-9a-f]{64}$/i.test(eTag[1])
    );
  },
  {
    message: "Must contain 'p' and 'e' tags with valid 64-character hex values",
  }
);

// Nonce Event Schema
export const nonceEventSchema = z.object({
  kind: z.literal(KINDS.NONCE),
  pubkey: z.string().length(64),
  content: z.string().transform((str) => {
    try {
      return nonceContentSchema.parse(JSON.parse(str));
    } catch (e) {
      throw new Error("Invalid nonce content format");
    }
  }),
  tags: commonTagsSchema,
  created_at: z.number(),
  id: z.string().length(64),
  sig: z.string().length(128),
});

// Adaptor Event Schema
export const adaptorEventSchema = z.object({
  kind: z.literal(KINDS.ADAPTOR),
  pubkey: z.string().length(64),
  content: z.string().transform((str) => {
    try {
      return adaptorContentSchema.parse(JSON.parse(str));
    } catch (e) {
      throw new Error("Invalid adaptor content format");
    }
  }),
  tags: commonTagsSchema,
  created_at: z.number(),
  id: z.string().length(64),
  sig: z.string().length(128),
});

// Type exports
export type NonceEvent = z.infer<typeof nonceEventSchema>;
export type AdaptorEvent = z.infer<typeof adaptorEventSchema>;
export type ProposalEvent = z.infer<typeof proposalEventSchema>;
