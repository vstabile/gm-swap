# NIP-XX: Sponsored Events

`draft` `optional`

This NIP introduces a workflow for sponsoring events on Nostr. Sponsored events allow users to get paid by selectively publishing events that may benefit both their audiences and advertisers willing to pay to expand their reach. Incentives are aligned as misuse by publishers has a cost in terms of reputation and followers. Timelocked Signature-Reveal Contracts ensure the payment in exchange for the event signature in a trustless way or enforced by a mutually trusted Cashu mint.

## Definitions

- **Advertiser**: The user submitting the Campaign Event, negotiating with publishers, approving the sponsored event and making the payment.
- **Publisher**: The user who will co-create and publish the sponsored event to his audience.
- **Sponsor**: The actual sponsor of the event that may or may not be the Advertiser.

## Kind 30050: Campaign Event

A replaceable event published by an advertiser to announce an event sponsorship campaign.

```json
{
    "kind": 30050,
    "content": <string (optional), a stringified unsigned example of sponsored event with the desired kind and suggestions for content and tags, without a pubkey>,
    "tags": []
}
```

### Tags

- `["d", "<campaign-id>"]`: A unique campaign id (required)
- `["title", "<campaign-title>"]`: A title for the campaign (optional)
- `["brief", "<campaign-brief>"]`: A brief of the campaign outlining the goals, target audience, and any specific requirements (required)
- `["k", "<kind>"]`: The kind of the sponsored event (required)
- `["created_at", "<start-timestamp>", "<end-timestamp>"`: Timestamps of when the sponsored events may be published (required)
- `["paymentMethod", "<method>"]`: `cashu` or `taproot` (required)
- `["mint", "<mint-1-url>", <"mint-2-url>", ...]`: An array of trusted Cashu mint URLs (required if `payment-method` is `cashu`)
- `["locktime", "<timestamp>"]`: Locktime by which the payment can be claimed (required)
- `["sponsor", "<sponsor-pubkey>"]`: The pubkey of the sponsor when it is different from the advertiser's (optional)
- `status`: `"active"` | `"closed"` Indicates whether the campaign is accepting proposals (required)
- `["t", "<topic>"]`: Topics describing the advertised content (e.g., `"podcast"`, `"foss"`, `"meetup"`) (optional)
- `["p", "<publisher-pubkey>"]`: Pubkey of specific publishers the advertiser would like to sponsor (optional)

### Example

```json
{
  "kind": 30050,
  "pubkey": "3b3a42d34cf0a1402d18d536c9d2ac2eb1c6019a9153be57084c8165d192e325",
  "created_at": 1710672000,
  "content": "{\"kind\":1,\"created_at\":1712686400,\"tags\":[[\"sponsored\",\"3b3a42d34cf0a1402d18d536c9d2ac2eb1c6019a9153be57084c8165d192e325\"],[\"r\",\"https://podcast-url.com\"]],\"content\":\"There's a new technical bitcoin podcast you should know about: Foobar Podcast!\"}",
  "tags": [
    ["d", "some-unique-id"],
    ["brief", "We are promoting Foobar Podcast, our new podcast about Bitcoin targeting a technical audience. We discuss the latest Bitcoin Optech newsletter. You can listen to our new episode here <some-url> and this link must be tagged in the sponsored event."],
    ["created_at", "1710672000", "1713264000"],
    ["payment-method", "cashu"],
    ["mint", "https://mint1.example.com", "https://mint2.example.com"],
    ["locktime", "1713772800"],
    ["sponsor", "<sponsor-pubkey>"],
    ["status", "active"]
    ["t", "podcast"],
    ["t", "bitcoin"],
    ["t", "foss"],
    ["p", "83d999a148625c3d2bb819af3064c0f6a12d7da88f68b2c69221f3a746171d19"],
    ["p", "8c1f616306523c19b9cba6e5c72d7f8efd55940620f40f24a5f1f253ac921ba2"]
  ],
}
```

## Kind 1051: Sponsored Event Proposal

A gift-wrapped ([NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md)) event that can be exchanged between the publisher and the advertiser, containing an unsigned proposed sponsored event. This event facilitates negotiation between them, proposing changes to the sponsored event and payment terms until an agreement is reached. The proposed event must include an `sponsored` tag with the sponsor's pubkey (from the Campaign Event's sponsor tag) so that clients can display it and possibly filter it out.

Comments and negotiations about the proposal should be done using NIP-22 comments (kind 1111) referencing this event.

```json
{
    "kind": 1051,
    "content": <string (required), a stringified unsigned proposed sponsored event>,
    "tags": []
}
```

### Tags

- `["a", "30050:<advertiser-pubkey>:<campaign-id>"]`: A reference to the Campaign Event related to this proposal (required)
- `["price", "<amount-in-sats>"]`: How much the advertiser will pay the publisher for signing the sponsored event (required)
- `["mint", "<mint-url>"]`: Cashu mint trusted by both parties that will ensure payment with the proper spending condition (required if the campaign `payment-method` is cashu)

### Example

```json
{
  "kind": 1051,
  "pubkey": "3b3a42d34cf0a1402d18d536c9d2ac2eb1c6019a9153be57084c8165d192e325",
  "created_at": 1710686400,
  "tags": [
    [
      "a",
      "30050:3b3a42d34cf0a1402d18d536c9d2ac2eb1c6019a9153be57084c8165d192e325:some-unique-id"
    ],
    ["price", "50000"],
    ["mint", "https://mint1.example.com"]
  ],
  "content": "{\"kind\":1,\"pubkey\":\"8c1f616306523c19b9cba6e5c72d7f8efd55940620f40f24a5f1f253ac921ba2\",\"created_at\":1712686400,\"tags\":[[\"sponsor\",\"3b3a42d34cf0a1402d18d536c9d2ac2eb1c6019a9153be57084c8165d192e325\"],[\"t\",\"bitcoin\"],[\"r\",\"https://podcast-url.com\"]],\"content\":\"Check out this awesome technical podcast that just came out! #bitcoin\"}"
}
```

### Comment Example

To comment on a proposal, use a NIP-22 comment event:

```json
{
  "kind": 1111,
  "content": "Happy to promote your podcast on my channel, I think my audience will really like it!",
  "tags": [
    ["E", "<proposal-event-id>", "wss://example.relay", "<publisher-pubkey>"],
    ["K", "1051"],
    ["P", "<publisher-pubkey>"],
    ["e", "<proposal-event-id>", "wss://example.relay", "<publisher-pubkey>"],
    ["k", "1051"],
    ["p", "<publisher-pubkey>"]
  ]
}
```

## Kind 1052: Sponsorship Agreement

A gift-wrapped ([NIP-59](https://github.com/nostr-protocol/nips/blob/master/59.md)) event sent from the advertiser to the publisher after an agreement is reached. It contains the final unsigned sponsored event (with the properly signed sponsor tag) and payment information as tags.

```json
{
    "kind": 1052,
    "content": <string (required), the stringified unsigned sponsored event>,
    "tags": []
}
```

### Tags

- `["e", "<publisher-final-proposal-id>"]`: A reference to the final proposal by the publisher related to this agreement (required)
- `["cashu", "<cashuB...>"]`: A Cashu token with a spending condition (NUT-XX) requiring the signature to the sponsored event (required if `payment-method` is `cashu`)
- `["taproot", ...]`: The necessary information for spending the Signature Reveal Path of the taproot script (required if `payment-method` is `taproot`)

### Example

```json
{
  "kind": 1052,
  "pubkey": "3b3a42d34cf0a1402d18d536c9d2ac2eb1c6019a9153be57084c8165d192e325",
  "created_at": 1710690000,
  "tags": [["cashu", "<cashuB...>"]],
  "content": "{\"kind\":1,\"pubkey\":\"8c1f616306523c19b9cba6e5c72d7f8efd55940620f40f24a5f1f253ac921ba2\",\"created_at\":1712686400,\"tags\":[[\"sponsor\",\"3b3a42d34cf0a1402d18d536c9d2ac2eb1c6019a9153be57084c8165d192e325\",\"<sponsors-signature>\"],[\"t\",\"bitcoin\"],[\"r\",\"https://podcast-url.com\"]],\"content\":\"Check out this awesome technical podcast that just came out! #bitcoin\"}"
}
```

## Workflow

1. **Campaign Publication**: An advertiser publishes a `kind:30050` event with the campaign details.

2. **Proposal Submission**: A publisher responds with a `kind:1051` gift-wrapped event, proposing a sponsored event and payment terms.

3. **Negotiation**: The advertiser and publisher may exchange additional `kind:1051` events, modifying the proposed event and terms until an agreement is reached. Clients may facilitate the exchange of direct encrypted messages ([NIP-XX]()) between them from negotiation until the payment is settled.

4. **Agreement**: The advertiser sends a `kind:1052` gift-wrapped event with the final unsigned sponsored event and the conditioned payment information.

5. **Payment and Publication**: The publisher signs the sponsored event, then claims the payment using the signature. The advertiser can then publish the event if the published has not done it already. If the payment locktime expires before being claimed, both parties may exchange direct messages and the advertiser may send a new `kind:1052` extending the timelock.

## Requirements

- Cashu Mints: When using Cashu for payment, the mint must support [NUT-DLC](https://github.com/cashubtc/nuts/pull/128) (DLC spending condition) and [NUT-7](https://github.com/cashubtc/nuts/blob/main/07.md) (to access the signature from the witness data).
