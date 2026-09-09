import { NextResponse } from "next/server";

const BACKEND = "https://new-backend-lovat.vercel.app/api";
const ALLOWED_ROOTS = new Set(["affiliates", "terminos"]);

type RouteContext = {
  params: Promise<{ path: string[] }> | { path: string[] };
};

async function proxy(request: Request, context: RouteContext) {
  const params = await context.params;
  const parts = Array.isArray(params?.path) ? params.path : [];
  const root = parts[0];

  if (!root || !ALLOWED_ROOTS.has(root)) {
    return NextResponse.json({ message: "Ruta no permitida" }, { status: 404 });
  }

  const incomingUrl = new URL(request.url);
  const target = new URL(`${BACKEND}/${parts.map(encodeURIComponent).join("/")}`);
  target.search = incomingUrl.search;

  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  if (authorization) headers.set("authorization", authorization);
  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);

  const method = request.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await request.arrayBuffer();

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
    });

    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) responseHeaders.set("content-type", upstreamContentType);
    responseHeaders.set("cache-control", "no-store, max-age=0");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[affiliate-proxy] upstream error", error);
    return NextResponse.json(
      { message: "No se pudo conectar con el servicio de afiliados" },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext) {
  return proxy(request, context);
}
export async function POST(request: Request, context: RouteContext) {
  return proxy(request, context);
}
export async function PUT(request: Request, context: RouteContext) {
  return proxy(request, context);
}
export async function PATCH(request: Request, context: RouteContext) {
  return proxy(request, context);
}
export async function DELETE(request: Request, context: RouteContext) {
  return proxy(request, context);
}
