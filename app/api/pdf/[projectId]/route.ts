import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { renderModo1Html, renderModo2Html } from "@/lib/pdf/template";
import { renderPdf } from "@/lib/pdf/render";
import { PDF_REQUIRED_PHASES, type PdfDocumentData } from "@/lib/pdf/types";
import { canAccessClient, getSessionUser } from "@/lib/authz";
import { requireActiveMembership } from "@/lib/membership";
import { getSetting } from "@/lib/settings";

export const maxDuration = 120;

const DEFAULT_BRAND_COLOR = "#1F3A5F";

/** Fases que necesita el PDF corto del Modo 2 (propias o heredadas del padre). */
const MODO2_PHASES = ["fase_2_1", "fase_2_2", "fase_5", "fase_6"] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      sections: { where: { status: "APPROVED" } },
    },
  });
  if (!project || !canAccessClient(user, project.clientId)) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  const blocked = await requireActiveMembership(user);
  if (blocked) return blocked;

  // En Modo 2 las secciones heredadas del padre cuentan como aprobadas.
  const dataByPhase = new Map<string, unknown>();
  if (project.mode === "MODO_2" && project.parentId) {
    const parentSections = await prisma.section.findMany({
      where: { projectId: project.parentId, status: "APPROVED" },
    });
    for (const s of parentSections) dataByPhase.set(s.phaseId, JSON.parse(s.data));
  }
  for (const s of project.sections) dataByPhase.set(s.phaseId, JSON.parse(s.data));

  const required =
    project.mode === "MODO_2" ? MODO2_PHASES : PDF_REQUIRED_PHASES;
  const missing = required.filter((p) => !dataByPhase.has(p));
  if (missing.length > 0) {
    return Response.json(
      {
        error: `El PDF no puede generarse: faltan secciones aprobadas (${missing.join(", ")})`,
      },
      { status: 422 },
    );
  }

  const branding = await getSetting<{ defaultBrandColor?: string }>(
    "branding",
    {},
  );
  const brandColor =
    project.brandColor ?? branding.defaultBrandColor ?? DEFAULT_BRAND_COLOR;

  // Ajuste #3 (A4.1) — datos de la ficha técnica de portada:
  // cara visible: fase_0 (nuevo campo) con fallback al campo del proyecto;
  // calendario: mes/año de la aprobación de fase_6 (cero datos nuevos).
  const fase0 = dataByPhase.get("fase_0") as
    | { nombreCaraVisible?: string | null }
    | undefined;
  const caraVisible = fase0?.nombreCaraVisible ?? project.caraVisible ?? null;
  const fase6Section = project.sections.find((s) => s.phaseId === "fase_6");
  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const calendarioMes = fase6Section?.approvedAt
    ? `${MESES[fase6Section.approvedAt.getMonth()]} ${fase6Section.approvedAt.getFullYear()}`
    : null;

  const base = {
    clientName: project.client.name,
    business: project.client.business,
    brandColor,
    caraVisible,
    calendarioMes,
  };

  const html =
    project.mode === "MODO_2"
      ? renderModo2Html({
          ...base,
          monthTitle: project.title,
          vehiculoNombre:
            (dataByPhase.get("fase_1_6") as { nombre?: string } | undefined)
              ?.nombre ?? null,
          fase_2_1: dataByPhase.get("fase_2_1") as PdfDocumentData["fase_2_1"],
          fase_2_2: dataByPhase.get("fase_2_2") as PdfDocumentData["fase_2_2"],
          fase_5: dataByPhase.get("fase_5") as PdfDocumentData["fase_5"],
          fase_6: dataByPhase.get("fase_6") as PdfDocumentData["fase_6"],
        })
      : renderModo1Html({
          ...base,
          ...(Object.fromEntries(
            PDF_REQUIRED_PHASES.map((p) => [p, dataByPhase.get(p)]),
          ) as Omit<PdfDocumentData, "clientName" | "business" | "brandColor">),
        });

  try {
    const pdf = await renderPdf(html, project.client.name);

    // Persistir el archivo FUERA de /public (contenido confidencial del
    // cliente: solo se descarga por este endpoint autenticado).
    const dir = path.join(process.cwd(), "storage", "pdfs");
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${projectId}.pdf`), pdf);
    await prisma.project.update({
      where: { id: projectId },
      data: {
        pdfUrl: `/api/pdf/${projectId}`,
        status: project.status === "REVIEW" ? "COMPLETED" : project.status,
      },
    });

    const filename = `LIONSCORE-${project.client.name.replace(/[^\p{L}\p{N}]+/gu, "-")}.pdf`;
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Error generando PDF:", err);
    return Response.json(
      { error: "No se pudo generar el PDF. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
