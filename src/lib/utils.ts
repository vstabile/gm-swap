import { type ClassValue, clsx } from "clsx";
import { nip19 } from "nostr-tools";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncatedNpub(pubkey: string) {
  const npub = pubkey.startsWith("npub1") ? pubkey : nip19.npubEncode(pubkey);
  return npub.slice(0, 8) + "..." + npub.slice(-5);
}
