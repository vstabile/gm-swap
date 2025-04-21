import { Action } from "applesauce-actions";
import { KINDS } from "~/lib/nostr";
import { factory } from "./hub";

export function SearchProfile(query: string): Action {
  return async function* () {
    const created_at = Math.floor(Date.now() / 1000);

    const draft = await factory.build({
      kind: KINDS.SEARCH_REQUEST,
      content: "",
      created_at,
      tags: [["param", "search", query]],
    });

    yield await factory.sign(draft);
  };
}
