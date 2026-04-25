import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const buf = await readFile(join(process.cwd(), "public", "logo.png"));
  const dataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
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
          style={{ width: 150, height: 150, objectFit: "contain" }}
        />
      </div>
    ),
    size,
  );
}
