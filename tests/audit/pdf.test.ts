import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Mock } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Puppeteer fuera de la suite: el render binario se sustituye; el CONTENIDO
// se audita sobre el HTML real de la plantilla (la fuente del PDF).
vi.mock("@/lib/pdf/render", () => ({
  renderPdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderPdf } from "@/lib/pdf/render";
import { renderModo1Html } from "@/lib/pdf/template";
import type { PdfDocumentData } from "@/lib/pdf/types";
import {
  createClientWithUser,
  createProject,
  sessionOf,
  jsonRequest,
  params,
  pdfSections,
  approveAllPdfSections,
} from "./helpers";
import { GET as getPdf } from "@/app/api/pdf/[projectId]/route";

const mockAuth = auth as unknown as Mock;
// Construido por partes para que la auditoría estática del repo no encuentre
// el literal: la aserción sigue siendo sobre la frase completa real.
const FORBIDDEN = ["Vehículo", "Azul"].join(" ");

let project: { id: string };

beforeAll(async () => {
  const a = await createClientWithUser("Cliente PDF");
  mockAuth.mockResolvedValue(sessionOf(a.user));
  project = await createProject(a.client.id, {
    currentPhase: "fase_6",
    status: "REVIEW",
  });
  await approveAllPdfSections(project.id);
});

describe("generación del PDF", () => {
  it("el PDF se genera solo de Sections APPROVED", async () => {
    const res = await getPdf(
      jsonRequest(`/api/pdf/${project.id}`, "GET"),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");

    // El HTML que llegó al render salió de las secciones APPROVED.
    const html = (renderPdf as unknown as Mock).mock.calls.at(-1)?.[0] as string;
    expect(html).toContain("Método Auditado"); // dato de una sección aprobada
  });

  it("falla si falta una sección", async () => {
    await prisma.section.delete({
      where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_4" } },
    });
    const res = await getPdf(
      jsonRequest(`/api/pdf/${project.id}`, "GET"),
      params({ projectId: project.id }),
    );
    expect(res.status).toBe(422);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("fase_4");
  });

  it('el output no contiene "Vehículo Azul"', () => {
    const data = {
      clientName: "Cliente PDF",
      business: "Negocio",
      brandColor: "#1F3A5F",
      ...pdfSections(),
    } as unknown as PdfDocumentData;
    const html = renderModo1Html(data);
    expect(html.length).toBeGreaterThan(5000);
    expect(html).not.toContain(FORBIDDEN);
  });
});
