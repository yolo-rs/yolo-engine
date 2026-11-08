import { serve } from "bun";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const R2_BUCKET = process.env.R2_BUCKET_NAME || "yolo-engine-assets";
const R2_ENDPOINT = process.env.R2_ENDPOINT || "https://cloudflare-r2.com";

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

console.log("[YOLO-ENGINE] CPK Streaming Server listening on port 8080 (Cloudflare R2 range streaming)");

serve({
  port: 8080,
  async fetch(req) {
    const url = new URL(req.url);
    const fileName = url.pathname.replace(/^\/cpk\//, "");

    const rangeHeader = req.headers.get("range");

    try {
      const command = new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileName,
        Range: rangeHeader || undefined,
      });

      const response = await s3.send(command);

      const headers = new Headers();
      headers.set("Content-Type", "application/octet-stream");
      headers.set("Accept-Ranges", "bytes");

      if (response.ContentRange) {
        headers.set("Content-Range", response.ContentRange);
      }
      if (response.ContentLength) {
        headers.set("Content-Length", response.ContentLength.toString());
      }

      return new Response(response.Body as any, {
        status: rangeHeader ? 206 : 200,
        headers,
      });
    } catch (err: any) {
      return new Response(`Error streaming asset: ${err.message}`, { status: 500 });
    }
  },
});
