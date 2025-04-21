import { ReplaceableLoader, SingleEventLoader } from "applesauce-loaders";
import { rxNostr } from "./nostr";
import { eventStore } from "~/stores/eventStore";

export const replaceableLoader = new ReplaceableLoader(rxNostr);

export const eventLoader = new SingleEventLoader(rxNostr);

// Start the loader and send any events to the event store
replaceableLoader.subscribe((packet) => {
  eventStore.add(packet.event, packet.from);
});

eventLoader.subscribe((packet) => {
  eventStore.add(packet.event, packet.from);
});
