# NIP: 455

## Atomic Signature Swaps

`draft` `optional`

This NIP proposes a standard for atomic signature swaps on Nostr. The goal is to enable atomic exchanges of signed Nostr events or payments unlocked by Schnorr signatures (e.g., P2PK Cashu tokens or Taproot payments) between Nostr users. This can facilitate use cases such as:

- Paying for the publication of Nostr events.
- Exchanging Nostr events.
- Issuing payment receipts as Nostr events.
- Signing contracts in the form of Nostr events in exchange for payments.
- Swapping different assets (Cashu or on-chain).

## High Level Flow

1. A user (announcer) may publish a `kind:455` (Swap Listing) event to announce his desire to swap something (e.g. pay for the signature of an event meeting some criteria)
2. Other interested users (counterparties) may negotiate those criteria (event content, payment amount, payment method, etc) by exchanging tentative `kind:455` (Swap Proposal) events, comments or DMs until they reach an agreement.
3. To accept a proposal, the counterparty publishes a `kind:456` (Swap Acceptance) event sharing the public nonce for his signature.
4. The proposer then publishes a `kind:457` (Swap Execution) event with his adaptor signature(s).
5. The counterparty completes the adaptor signature by adding his own signature to it and use it to publish the Nostr event or claim a payment.
6. The proposer retrieves the completed signature (from a relay, mint or blockchain) and extract his desired signature by subtracting his own adaptor signature.

## Event Kinds

- `30455` - **Swap Listing:** An optional event to publicly list swap intentions.
- `455` - **Swap Proposal:** An event proposing a swap to another pubkey.
- `456` - **Swap Acceptance:** An event accepting a swap proposal.
- `457` - **Swap Execution:** An event sharing the adaptor signature needed to execute the swap.

### Swap Listing (kind 30455)

### Swap Proposal (kind 455)

The `Swap Proposal` event is sent from the proposer to the counterparty. It contains the following fields:

- `tags` - Array of tags including:
  - `p` - The counterparty’s public key.
  - `mint` - Array of accepted Cashu mints (if applicable).
  - `exp` - Expiration timestamp (optional).
  - `ref` - Reference to a `30455` Swap Listing event (optional).
  - `desc` - Description (optional).
- `content` - A JSON object with the following structure:
  ```json
  {
    offer: {
      type: "cashu",
      amount: <amount>,
      mint: "<mint_url>"
    },
    request: {
      type: "nostr",
      template: {
        content: "<content>"
        tags: [
          ...
        ]
      }
    }
  }
  ```

### Swap Acceptance (kind 456)

The `Swap Acceptance` event is sent from the counterparty to the proposer upon accepting a swap:

- `tags` - Array of tags including:
  - `e` - Event ID of the `10455` Swap Proposal being accepted.
  - `p` - Public key of the author of the proposal
  - `mint` - The specific Cashu mint being used (if applicable).
- `content` - A JSON object containing:
  ```json
  {
    "nonce": "<nonce_value>",
    "encrypted_scalar": "<encrypted_value (optional)>",
    "mint": "<mint_url (optional)>"
  }
  ```

### Swap Execution (kind 457)

The proposer sends a new event containing the adaptor signature(s) after receiving the acceptance. This finalization is done by publishing a new event linked to the acceptance.

```json
{
  "adaptors": [
    {
      sa: "<adaptor signature>",
      Rx: "<x-coordinate of the public nonce>",
      Rax: "<x-coordinate of the adaptor point>"
    },
    ...
  ],
  "cashu": "<cashu V4 token (if applicable)>"
}
```

- `tags` - Array of tags including:
  - `e` - Event ID of the `kind:456` Swap Acceptance
  - `E` - Event ID of the `kind:455` Swap Proposal
  - `p` - Public key of the counterparty

### Privacy and Revocation

Swap details can be encrypted to protect privacy. Additionally, either party may revoke the swap by deleting the corresponding proposal or acceptance event.

### Extensibility

Future types of signatures can be added without breaking the existing protocol by using the generic signature field structure.

### Security Considerations

1. The atomic swaps depends on at least one of the signatures being accessible by the other party. For Nostr events it means that it should be expected that one of the signed events will be published to a relay the other party can access. When using Cashu mints, this means they must implement NUT-07, NUT-10 and NUT-11.
2. When dealing with Taproot payments or Cashu for Cashu swaps, those payments must be timelocked to a 2-of-2 multisig.
