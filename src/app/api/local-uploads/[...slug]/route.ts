import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { resolveMediaFileMeta } from "@/lib/s3Storage";

export const dynamic = "force-dynamic";

const UPLOADS_ROOT = path.resolve(process.cwd(), "public", "uploads");

/**
 * Serves locally stored demo/fallback files created at runtime inside public/uploads,
 * ensuring Next.js production builds (`next start`) can stream newly uploaded files
 * and seek audio ranges cleanly without requiring a rebuild.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> | { slug?: string[] } }
) {
  const resolvedParams = await Promise.resolve(context.params);
  const segments = (resolvedParams?.slug || []).map((s) => decodeURIComponent(s));

  if (segments.length === 0 || segments.some((s) => !s || s === "." || s === ".." || s.includes("\\"))) {
    return new NextResponse("Invalid file path", { status: 400 });
  }

  const targetPath = path.resolve(UPLOADS_ROOT, ...segments);
  const rootPrefix = UPLOADS_ROOT.endsWith(path.sep) ? UPLOADS_ROOT : UPLOADS_ROOT + path.sep;
  if (!targetPath.startsWith(rootPrefix)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
    return new NextResponse("File not found", { status: 404 });
  }

  const stat = fs.statSync(targetPath);
  const totalSize = stat.size;
  const relKey = segments.join("/");
  const { contentType } = resolveMediaFileMeta(relKey, "application/octet-stream");
  const baseName = segments[segments.length - 1].replace(/[^\w.\-() ]+/g, "_") || "file";

  const rangeHeader = req.headers.get("range");
  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match) {
      return new NextResponse("Invalid Range header", { status: 416 });
    }

    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? Math.min(parseInt(match[2], 10), totalSize - 1) : totalSize - 1;
    if (isNaN(start) || isNaN(end) || start > end || start >= totalSize) {
      return new NextResponse("Requested range not satisfiable", {
        status: 416,
        headers: { "Content-Range": `bytes */${totalSize}` },
      });
    }

    const fd = fs.openSync(targetPath, "r");
    try {
      const chunkSize = end - start + 1;
      const chunk = Buffer.alloc(chunkSize);
      fs.readSync(fd, chunk, 0, chunkSize, start);
      return new NextResponse(chunk, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${baseName}"`,
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Content-Length": String(chunkSize),
          "Cache-Control": "no-cache",
        },
      });
    } finally {
      fs.closeSync(fd);
    }
  }

  const fileBuffer = fs.readFileSync(targetPath);
  return new NextResponse(fileBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${baseName}"`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(totalSize),
      "Cache-Control": "no-cache",
    },
  });
}
