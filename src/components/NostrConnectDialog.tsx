import QRCode from "qrcode-svg";
import { createEffect, createSignal } from "solid-js";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export default function NostrConnectDialog(props: {
  uri?: string;
  onClose: () => void;
}) {
  const [svgString, setSvgString] = createSignal("");
  const [copied, setCopied] = createSignal(false);

  // Generate QR code when URI changes
  createEffect(() => {
    if (!props.uri) return;

    const qrcode = new QRCode({
      content: props.uri,
      width: 256,
      height: 256,
      padding: 4,
      color: "#000000",
      background: "#ffffff",
      ecl: "M", // Error correction level
    });

    setSvgString(qrcode.svg());
  });

  const copyToClipboard = async () => {
    if (!props.uri) return;

    try {
      await navigator.clipboard.writeText(props.uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <Dialog open={!!props.uri} onOpenChange={props.onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="text-center">
            Scan with Nostr Connect App
          </DialogTitle>
        </DialogHeader>

        <div class="flex flex-col items-center mb-4 mt-2">
          <div innerHTML={svgString()} />

          <div class="text-xs text-gray-500 break-all text-center max-w-sm">
            {props.uri}
          </div>
        </div>

        <DialogFooter class="flex flex-col sm:flex-row justify-center gap-2">
          <Button onClick={copyToClipboard} class="flex w-full">
            {copied() ? "Copied!" : "Copy URI"}
          </Button>
          <Button onClick={props.onClose} variant="outline" class="flex w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
