import { ProfileContent } from "applesauce-core/helpers";
import { type ClassValue, clsx } from "clsx";
import { nip19 } from "nostr-tools";
import { Observable, Subscription } from "rxjs";
import { Accessor, createEffect, createSignal, onCleanup } from "solid-js";
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

export function profileName(profile: ProfileContent, pubkey: string) {
  return profile?.display_name || profile?.name || truncatedNpub(pubkey);
}

export function waitForNip07(retries = 10, delay = 100): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      if (window.nostr) {
        resolve(true);
      } else if (attempts < retries) {
        attempts++;
        setTimeout(check, delay);
      } else {
        resolve(false);
      }
    };
    check();
  });
}
