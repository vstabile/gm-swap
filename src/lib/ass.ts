import { ProjPointType } from "@noble/curves/abstract/weierstrass";
import { schnorr, secp256k1 as secp } from "@noble/curves/secp256k1";
import { getEventHash, NostrEvent } from "nostr-tools";
import { Swap } from "~/queries/swap";

export type Adaptor = {
  sa: string; // The adaptor scalar
  R: string; // The proposer's public nonce
  T: string; // The adaptor point
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
  for (const { sa, R, T } of adaptors) {
    const s_a = BigInt(`0x${sa}`);
    // Completed scalar: s_c = s_a + t
    const s_c = (s_a + t) % secp.CURVE.n;

    const R_point = secp.ProjectivePoint.fromHex(R);
    const T_point = secp.ProjectivePoint.fromHex(T);

    // The adaptor public nonce
    const Ra = R_point.add(T_point);

    // Signature is the adaptor nonce (R_a) and the completed scalar (s_c)
    const sig = bytesToHex(
      new Uint8Array([
        ...hexToBytes(Ra.x.toString(16).padStart(64, "0")),
        ...hexToBytes(s_c.toString(16).padStart(64, "0")),
      ])
    );

    sigs.push(sig);
  }

  return sigs;
}

export function extractSignature(swap: Swap): string {
  const s_give = BigInt(`0x${swap.given.sig.substring(64)}`);
  const adaptors = swap.adaptors;

  const s_a = BigInt("0x" + adaptors[0].sa);
  const t = (s_give - s_a + secp.CURVE.n) % secp.CURVE.n;
  const secret = t.toString(16).padStart(64, "0");

  const sig = bytesToHex(
    new Uint8Array([...hexToBytes(swap.nonce), ...hexToBytes(secret)])
  );

  return sig;
}

export function verifyAdaptors(
  proposal: NostrEvent,
  adaptors: Adaptor[]
): boolean {
  const giveType = getGivenType(proposal);
  if (giveType !== "nostr") {
    throw new Error(`Given type not implemented: ${giveType}`);
  }

  // Nostr events require a single adaptor
  const adaptor = adaptors[0];

  const R_point = secp.ProjectivePoint.fromHex(adaptor.R);
  const T_point = secp.ProjectivePoint.fromHex(adaptor.T);
  const Ra = R_point.add(T_point);

  const P_p = proposal.pubkey;
  const R_a_x = Ra.x.toString(16).padStart(64, "0");
  const giveId = getGivenId(proposal);

  // Computes the challenge for the take
  let challenge = schnorr.utils.taggedHash(
    "BIP0340/challenge",
    new Uint8Array([
      ...hexToBytes(R_a_x),
      ...hexToBytes(P_p),
      ...hexToBytes(giveId),
    ])
  );

  const c_give = BigInt("0x" + bytesToHex(challenge));

  // Verifies each adaptor signature:
  // s_a * G ?= R_p + H(R_p + T || P_p || m) * P_p
  let areAdaptorsValid = true;

  const s_a = BigInt("0x" + adaptor.sa);

  const left = secp.ProjectivePoint.BASE.multiply(s_a);
  const rightEven = R_point.add(
    schnorr.utils.lift_x(BigInt("0x" + P_p)).multiply(c_give)
  );
  // Check the case where the proposer's private key is associated with
  // a point on the curve with an odd y-coordinate (BIP340) by negating the challenge
  const rightOdd = R_point.add(
    schnorr.utils.lift_x(BigInt("0x" + P_p)).multiply(secp.CURVE.n - c_give)
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
  const takeId = getTakenId(proposal);
  const counterparty = proposal.tags.filter((t) => t[0] === "p")[0][1];
  // Computes the take signature challenge using counterparty's public nonce:
  // c_take = H(R_s || P_s || m)
  const c_take = schnorr.utils.taggedHash(
    "BIP0340/challenge",
    new Uint8Array([
      ...hexToBytes(nonce),
      ...hexToBytes(counterparty),
      ...hexToBytes(takeId),
    ])
  );

  // Converts the nonce to a point on the curve
  const R_s = schnorr.utils.lift_x(BigInt("0x" + nonce));

  // And computes the adaptor point T as a commitment to the Nostr signature:
  // T = R_s + c_take * P_s
  let T = R_s.add(
    schnorr.utils
      .lift_x(BigInt("0x" + counterparty))
      .multiply(BigInt("0x" + bytesToHex(c_take)))
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

  // Then calculates the give challenge:
  // H(R + T || P_p || m)
  const giveId = getGivenId(proposal);
  const c_give = schnorr.utils.taggedHash(
    "BIP0340/challenge",
    new Uint8Array([
      ...R_a_x,
      ...hexToBytes(proposal.pubkey),
      ...hexToBytes(giveId),
    ])
  );

  // Scalars conversion to BigInt for arithmetic operations
  const r = BigInt(`0x${bytesToHex(r_p)}`) % secp.CURVE.n;
  let c = BigInt(`0x${bytesToHex(c_give)}`) % secp.CURVE.n;
  const k = BigInt(`0x${bytesToHex(key)}`) % secp.CURVE.n;

  // The challenge must be negated if the proposer's private key is associated with
  // a point on the curve with an odd y-coordinate (BIP340)
  const P_p_point = secp.ProjectivePoint.fromPrivateKey(key);
  if ((P_p_point.y & 1n) === 1n) {
    c = secp.CURVE.n - c;
  }

  // Calculates the adaptor scalar: s_a = r_p + c_give * k_p
  const s_a = (r + ((c * k) % secp.CURVE.n)) % secp.CURVE.n;

  return [
    {
      sa: s_a.toString(16).padStart(64, "0"),
      R: R_p.toHex(),
      T: T.toHex(),
    },
  ];
}

// Helper functions

export function getTakenId(proposal: NostrEvent): string {
  const pubkey = proposal.tags.filter((t) => t[0] === "p")[0][1];
  if (!pubkey) throw new Error("No pubkey found");

  const nostrEvent = {
    pubkey,
    ...JSON.parse(proposal.content)["take"]["template"],
  };

  return getEventHash(nostrEvent);
}

export function getGivenId(proposal: NostrEvent): string {
  const nostrEvent = {
    pubkey: proposal.pubkey,
    ...JSON.parse(proposal.content)["give"]["template"],
  };

  return getEventHash(nostrEvent);
}

function getGivenType(proposal: NostrEvent): string {
  return JSON.parse(proposal.content)["give"]["type"];
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
