import { createEffect, createSignal, onMount } from "solid-js";
import QRCodeSVG from "qrcode-svg";

interface QRCodeProps {
  data: string;
  width?: number;
  height?: number;
  color?: string;
  background?: string;
  ecl?: "L" | "M" | "Q" | "H";
}

export default function QRCode(props: QRCodeProps) {
  const [svgContent, setSvgContent] = createSignal<string>("");

  createEffect(() => {
    if (!props.data) return;

    const qrcode = new QRCodeSVG({
      content: props.data,
      width: props.width || 256,
      height: props.height || 256,
      padding: 4,
      color: props.color || "#000000",
      background: props.background || "#ffffff",
      ecl: props.ecl || "M",
    });

    setSvgContent(qrcode.svg());
  });

  return <div innerHTML={svgContent()} />;
}
