interface Window {
  nostr?: {
    getPublicKey?: () => Promise<string>;
    signEvent?: (event: any) => Promise<any>;
    getRelays?: () => Promise<
      Record<string, { read: boolean; write: boolean }>
    >;
    nip04?: {
      encrypt: (pubkey: string, plaintext: string) => Promise<string>;
      decrypt: (pubkey: string, ciphertext: string) => Promise<string>;
    };
    [key: string]: any;
  };
}
