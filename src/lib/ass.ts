import { ProjPointType } from "@noble/curves/abstract/weierstrass";
import { schnorr, secp256k1 as secp } from "@noble/curves/secp256k1";
import { getEventHash, NostrEvent } from "nostr-tools";

export type Adaptor = {
  sa: string; // The adaptor scalar
  Ra: string; // The adaptor public nonce
  R: string; // The proposer's public nonce
};

export function completeSignatures(
  proposal: NostrEvent,
  adaptors: Adaptor[],
  secret: string
): string[] {
  if (!verifyAdaptors(proposal, adaptors)) {
    throw new Error("Invalid adaptors");
  }

  const t = BigInt(`0x${secret}`);

  let sigs: string[] = [];
  for (const { sa, Ra } of adaptors) {
    const s_a = BigInt(`0x${sa}`);
    // Completed scalar: s_c = s_a + t
    const s_c = (s_a + t) % secp.CURVE.n;

    // Signature is the adaptor nonce (R_a) and the completed scalar (s_c)
    const sig = bytesToHex(
      new Uint8Array([
        ...hexToBytes(Ra),
        ...hexToBytes(s_c.toString(16).padStart(64, "0")),
      ])
    );

    sigs.push(sig);
  }

  return sigs;
}

export function extractSignature(
  acceptance: NostrEvent,
  execution: NostrEvent,
  offer: NostrEvent
): string {
  const s_offer = BigInt(`0x${offer.sig.substring(64)}`);
  const adaptors = JSON.parse(execution.content).adaptors;

  const s_a = BigInt("0x" + adaptors[0].sa);
  const t = (s_offer - s_a + secp.CURVE.n) % secp.CURVE.n;
  const secret = t.toString(16).padStart(64, "0");

  const sig = bytesToHex(
    new Uint8Array([
      ...hexToBytes(JSON.parse(acceptance.content).nonce),
      ...hexToBytes(secret),
    ])
  );

  return sig;
}

export function verifyAdaptors(
  proposal: NostrEvent,
  adaptors: Adaptor[]
): boolean {
  const offerType = getOfferType(proposal);
  if (offerType !== "nostr") {
    throw new Error(`Offer type not implemented: ${offerType}`);
  }

  // Nostr events require a single adaptor
  const adaptor = adaptors[0];

  const P_p = proposal.pubkey;
  const R_p = schnorr.utils.lift_x(BigInt("0x" + adaptor.R));
  const R_a_x = adaptor.Ra;
  const offerId = getOfferId(proposal);

  // Computes the challenge for the request
  let challenge = schnorr.utils.taggedHash(
    "BIP0340/challenge",
    new Uint8Array([
      ...hexToBytes(R_a_x),
      ...hexToBytes(P_p),
      ...hexToBytes(offerId),
    ])
  );

  const c_offer = BigInt("0x" + bytesToHex(challenge));

  // Verifies each adaptor signature:
  // s_a * G ?= R_p + H(R_p + T || P_p || m) * P_p
  let areAdaptorsValid = true;

  const s_a = BigInt("0x" + adaptor.sa);

  const left = secp.ProjectivePoint.BASE.multiply(s_a);
  const rightEven = R_p.add(
    schnorr.utils.lift_x(BigInt("0x" + P_p)).multiply(c_offer)
  );
  // Check the case where the proposer's private key is associated with
  // a point on the curve with an odd y-coordinate (BIP340) by negating the challenge
  const rightOdd = R_p.add(
    schnorr.utils.lift_x(BigInt("0x" + P_p)).multiply(secp.CURVE.n - c_offer)
  );

  // The adaptor signature is valid if one of the verifications is valid
  if (!left.equals(rightEven) && !left.equals(rightOdd)) {
    areAdaptorsValid = false;
  }

  return areAdaptorsValid;
}

export function computeAdaptors(
  proposal: NostrEvent,
  nonce: string,
  key: Uint8Array
): Adaptor[] {
  const requestId = getRequestId(proposal);
  const counterparty = proposal.tags.filter((t) => t[0] === "p")[0][1];
  // Computes the request signature challenge using counterparty's public nonce:
  // c_request = H(R_s || P_s || m)
  const c_request = schnorr.utils.taggedHash(
    "BIP0340/challenge",
    new Uint8Array([
      ...hexToBytes(nonce),
      ...hexToBytes(counterparty),
      ...hexToBytes(requestId),
    ])
  );

  // Converts the nonce to a point on the curve
  const R_s = schnorr.utils.lift_x(BigInt("0x" + nonce));

  // And computes the adaptor point T as a commitment to the Nostr signature:
  // T = R_s + c_request * P_s
  let T = R_s.add(
    schnorr.utils
      .lift_x(BigInt("0x" + counterparty))
      .multiply(BigInt("0x" + bytesToHex(c_request)))
  );

  // Generates a nonce (r_p) and the adaptor public nonce (R_p + T)
  // ensuring that both R_p and R_a = (R_p + T) have even y-coordinates (BIP340)
  let r_p: Uint8Array, R_p: ProjPointType<bigint>, R_a: ProjPointType<bigint>;
  do {
    r_p = schnorr.utils.randomPrivateKey();
    R_p = secp.ProjectivePoint.fromPrivateKey(r_p);

    // Negate the nonce if its point has an odd y-coordinate
    if ((R_p.y & 1n) === 1n) {
      r_p = negateScalar(r_p);
      R_p = R_p.negate();
    }

    R_a = R_p.add(T);
    // Try again if the adaptor nonce has an odd y-coordinate
  } while ((R_a.y & 1n) === 1n);

  // Adaptor nonce X-coordinate
  const R_a_x = hexToBytes(R_a.x.toString(16).padStart(64, "0"));
  // Proposer's nonce X-coordinate
  const R_p_x = hexToBytes(R_p.x.toString(16).padStart(64, "0"));

  // Then calculates the offer challenge:
  // H(R + T || P_p || m)
  const offerId = getOfferId(proposal);
  const c_offer = schnorr.utils.taggedHash(
    "BIP0340/challenge",
    new Uint8Array([
      ...R_a_x,
      ...hexToBytes(proposal.pubkey),
      ...hexToBytes(offerId),
    ])
  );

  // Scalars conversion to BigInt for arithmetic operations
  const r = BigInt(`0x${bytesToHex(r_p)}`) % secp.CURVE.n;
  let c = BigInt(`0x${bytesToHex(c_offer)}`) % secp.CURVE.n;
  const k = BigInt(`0x${bytesToHex(key)}`) % secp.CURVE.n;

  // The challenge must be negated if the proposer's private key is associated with
  // a point on the curve with an odd y-coordinate (BIP340)
  const P_p_point = secp.ProjectivePoint.fromPrivateKey(key);
  if ((P_p_point.y & 1n) === 1n) {
    c = secp.CURVE.n - c;
  }

  // Calculates the adaptor scalar: s_a = r_p + c_offer * k_p
  const s_a = (r + ((c * k) % secp.CURVE.n)) % secp.CURVE.n;

  return [
    {
      sa: s_a.toString(16).padStart(64, "0"),
      R: bytesToHex(R_p_x),
      Ra: bytesToHex(R_a_x),
    },
  ];
}

// Helper functions

function getRequestId(proposal: NostrEvent): string {
  const pubkey = proposal.tags.filter((t) => t[0] === "p")[0][1];
  if (!pubkey) throw new Error("No pubkey found");

  const nostrEvent = {
    pubkey,
    ...JSON.parse(proposal.content)["request"]["template"],
  };

  return getEventHash(nostrEvent);
}

function getOfferId(proposal: NostrEvent): string {
  const nostrEvent = {
    pubkey: proposal.pubkey,
    ...JSON.parse(proposal.content)["offer"]["template"],
  };

  return getEventHash(nostrEvent);
}

function getOfferType(proposal: NostrEvent): string {
  return JSON.parse(proposal.content)["offer"]["type"];
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(
    hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function negateScalar(scalar: Uint8Array): Uint8Array {
  const s = BigInt("0x" + bytesToHex(scalar));
  const negated = (secp.CURVE.n - s) % secp.CURVE.n;
  return hexToBytes(negated.toString(16).padStart(64, "0"));
}
