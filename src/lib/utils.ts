import { type ClassValue, clsx } from "clsx";
import { nip19 } from "nostr-tools";
import { Observable, Subscription } from "rxjs";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncatedNpub(pubkey: string) {
  const npub = pubkey.startsWith("npub1") ? pubkey : nip19.npubEncode(pubkey);
  return npub.slice(0, 8) + "..." + npub.slice(-5);
}

export function fromReactive<T>(getObservable: () => Observable<T>) {
  const [value, setValue] = createSignal<T>();

  createEffect(() => {
    const observable = getObservable();
    const subscription: Subscription = observable.subscribe(setValue);

    onCleanup(() => subscription.unsubscribe());
  });

  return value;
}
