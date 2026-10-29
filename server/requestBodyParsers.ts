import express, { type Request } from "express";

// No client workflow sends compressed bodies. Reject before decompression;
// response compression is independent and remains enabled.
export function createJsonBodyParser() {
  return express.json({
    inflate: false,
    limit: "1mb",
    verify: (req: Request, _res, buf) => {
      // Preserve exact webhook bytes for Meta's signature verification.
      if (req.url?.startsWith("/api/webhook/whatsapp")) {
        (req as any).rawBody = Buffer.from(buf);
      }
    },
  });
}

export function createFormBodyParser() {
  return express.urlencoded({ extended: false, limit: "1mb", inflate: false });
}
