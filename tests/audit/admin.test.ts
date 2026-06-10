import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Mock } from "vitest";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { createClientWithUser, sessionOf, jsonRequest, params } from "./helpers";

const mockAuth = auth as unknown as Mock;
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const ADMIN_DIR = path.join(process.cwd(), "app", "api", "admin");

/** Descubre TODAS las rutas admin por filesystem: una ruta nueva sin
 *  protección cae en este test automáticamente. */
function discoverAdminRoutes(dir = ADMIN_DIR): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...discoverAdminRoutes(full));
    else if (entry.name === "route.ts") out.push(full);
  }
  return out;
}

const routeFiles = discoverAdminRoutes();

interface Handler {
  file: string;
  method: string;
  fn: (req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>;
}
const handlers: Handler[] = [];

beforeAll(async () => {
  for (const file of routeFiles) {
    const mod = await import(pathToFileURL(file).href);
    for (const method of METHODS) {
      if (typeof mod[method] === "function") {
        handlers.push({ file: path.relative(process.cwd(), file), method, fn: mod[method] });
      }
    }
  }
});

describe("protección de rutas admin (descubiertas por filesystem)", () => {
  it("CLIENT recibe 403 en cada ruta admin", async () => {
    expect(routeFiles.length).toBeGreaterThanOrEqual(10);
    const { user } = await createClientWithUser("Cliente Intruso");
    mockAuth.mockResolvedValue(sessionOf(user));

    expect(handlers.length).toBeGreaterThan(0);
    for (const h of handlers) {
      const res = await h.fn(
        jsonRequest("/api/admin/x", h.method, {}),
        params({ id: "x", phaseId: "x" }),
      );
      expect(res.status, `${h.method} ${h.file} debe devolver 403 a CLIENT`).toBe(403);
    }
  });

  it("sin sesión recibe 401", async () => {
    mockAuth.mockResolvedValue(null);
    for (const h of handlers) {
      const res = await h.fn(
        jsonRequest("/api/admin/x", h.method, {}),
        params({ id: "x", phaseId: "x" }),
      );
      expect(res.status, `${h.method} ${h.file} debe devolver 401 sin sesión`).toBe(401);
    }
  });
});
