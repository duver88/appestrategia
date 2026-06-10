// Tipos estrictos para los campos que en PostgreSQL serán enums nativos.
// (SQLite no soporta enums en Prisma; ver nota en prisma/schema.prisma)

export type ProjectMode = "MODO_1" | "MODO_2";
export type ProjectStatus = "IN_PROGRESS" | "REVIEW" | "COMPLETED";
export type SectionStatus = "DRAFT" | "APPROVED";
export type MessageRole = "user" | "assistant";

export interface SectionDTO {
  id: string;
  phaseId: string;
  data: unknown;
  status: SectionStatus;
  version: number;
  needsReview: boolean;
  approvedAt: string | null;
}

export interface MessageDTO {
  id: string;
  phaseId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}
