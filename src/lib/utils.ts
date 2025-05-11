import { ProfileContent } from "applesauce-core/helpers";
import { ProfileQuery } from "applesauce-core/queries";
import { type ClassValue, clsx } from "clsx";
import { nip19 } from "nostr-tools";
import { Observable, Subscription } from "rxjs";
import { createEffect, createSignal, from, onCleanup } from "solid-js";
import { twMerge } from "tailwind-merge";
import { queryStore } from "~/stores/queryStore";
import { replaceableLoader } from "./loaders";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function truncate(value: string, length: number = 15) {
  if (value.length <= length) {
    return value;
  }

  return value.slice(0, length - 5) + "..." + value.slice(-5);
}

export function truncatedNpub(pubkey: string) {
  const npub = pubkey.startsWith("npub1") ? pubkey : nip19.npubEncode(pubkey);
  return truncate(npub);
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

export function formatContent(content: string) {
  return content.replace(/nostr:npub1[a-zA-Z0-9]+/g, (match) => {
    const [npubProfiles, setNpubProfiles] = createSignal(
      new Map<string, ProfileContent>()
    );
    const npubMatches = content.match(/nostr:npub1[a-zA-Z0-9]+/g) || [];

    for (const match of npubMatches) {
      const npub = match.replace("nostr:", "");
      try {
        const pubkey = nip19.decode(npub).data as string;
        const profile = from(queryStore.createQuery(ProfileQuery, pubkey));

        replaceableLoader.next({
          pubkey,
          kind: 0,
        });

        // Store the profile in our map
        setNpubProfiles((prev) => new Map(prev).set(npub, profile()));
      } catch (error) {
        console.error(error);
      }
    }

    const npub = match.replace("nostr:", "");
    const profile = npubProfiles().get(npub);
    const displayName = truncate(profileName(profile, npub));

    return `<a href="https://njump.me/${npub}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${displayName}</a>`;
  });
}

export function formatDate(timestamp: number) {
  return new Date(timestamp * 1000)
    .toLocaleString(undefined, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    })
    .replace(",", "");
}
