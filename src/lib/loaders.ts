import { ReplaceableLoader } from "applesauce-loaders";
import { RELAYS, rxNostr } from "./nostr";
import { eventStore } from "~/stores/eventStore";
import { Filter, NostrEvent } from "nostr-tools";
import { map, Observable } from "rxjs";
import { createRxOneshotReq } from "rx-nostr";

function nostrRequest(
  relays: string[],
  filters: Filter[],
  id?: string
): Observable<NostrEvent> {
  const req = createRxOneshotReq({ filters, rxReqId: id });
  return rxNostr
    .use(req, { on: { relays } })
    .pipe(map((packet) => packet.event));
}

export const replaceableLoader = new ReplaceableLoader(nostrRequest, {
  lookupRelays: RELAYS,
});

replaceableLoader.subscribe((event) => {
  eventStore.add(event);
});
