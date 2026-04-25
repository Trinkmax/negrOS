import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Maskable: padding extra para safe-zone (~80% del canvas)
export default async function IconMaskable() {
  const buf = await readFile(join(process.cwd(), "public", "logo.png"));
  const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={dataUrl}
          alt="nos"
          style={{ width: 320, height: 320, objectFit: "contain" }}
        />
      </div>
    ),
    size,
  );
}
