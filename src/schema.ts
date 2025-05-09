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
    const eTag =
      tags.find((tag) => tag[0] === "e") || tags.find((tag) => tag[0] === "E");
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

// Bunker URI Schema
const bunkerUriSchema = z.string().refine(
  (uri) => {
    try {
      const url = new URL(uri);
      if (url.protocol !== "bunker:") return false;

      // Validate pubkey in hostname
      const pubkey = url.hostname;
      if (!/^[0-9a-f]{64}$/i.test(pubkey)) return false;

      // Validate relays
      const relays = url.searchParams.getAll("relay");
      if (relays.length === 0) return false;
      for (const relay of relays) {
        try {
          const relayUrl = new URL(relay);
          if (relayUrl.protocol !== "wss:") return false;
        } catch {
          return false;
        }
      }

      // Validate secret if present
      const secret = url.searchParams.get("secret");
      if (secret && !/^[a-zA-Z0-9_-]{1,64}$/.test(secret)) return false;

      return true;
    } catch {
      return false;
    }
  },
  {
    message: "Invalid bunker URI format",
  }
);

// NostrConnect URI Schema
const nostrConnectUriSchema = z.string().refine(
  (uri) => {
    try {
      const url = new URL(uri);
      if (url.protocol !== "nostrconnect:") return false;

      // Validate pubkey in hostname
      const pubkey = url.hostname;
      if (!/^[0-9a-f]{64}$/i.test(pubkey)) return false;

      // Validate required parameters
      const relays = url.searchParams.getAll("relay");
      if (relays.length === 0) return false;
      for (const relay of relays) {
        try {
          const relayUrl = new URL(relay);
          if (relayUrl.protocol !== "wss:") return false;
        } catch {
          return false;
        }
      }

      const secret = url.searchParams.get("secret");
      if (!secret || !/^[a-zA-Z0-9_-]{1,64}$/.test(secret)) return false;

      // Validate optional parameters
      const perms = url.searchParams.get("perms");
      if (perms && !/^[a-zA-Z0-9_,-]+$/.test(perms)) return false;

      const name = url.searchParams.get("name");
      if (name && name.length > 100) return false;

      const appUrl = url.searchParams.get("url");
      if (appUrl) {
        try {
          new URL(appUrl);
        } catch {
          return false;
        }
      }

      const image = url.searchParams.get("image");
      if (image) {
        try {
          new URL(image);
        } catch {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  },
  {
    message: "Invalid nostrconnect URI format",
  }
);

// Combined URI Schema
export const connectionUriSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("bunker"),
    uri: bunkerUriSchema,
  }),
  z.object({
    type: z.literal("nostrconnect"),
    uri: nostrConnectUriSchema,
  }),
]);

// Type exports
export type ConnectionUri = z.infer<typeof connectionUriSchema>;
export type NonceEvent = z.infer<typeof nonceEventSchema>;
export type AdaptorEvent = z.infer<typeof adaptorEventSchema>;
export type ProposalEvent = z.infer<typeof proposalEventSchema>;
