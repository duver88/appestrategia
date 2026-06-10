import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PromptEditor } from "@/components/admin/PromptEditor";

export const dynamic = "force-dynamic";

export default async function AdminPromptEditorPage({
  params,
}: {
  params: Promise<{ phaseId: string }>;
}) {
  const { phaseId } = await params;
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/prompts"
        className="mb-4 inline-flex items-center gap-1 text-[13.5px] font-bold"
        style={{ color: "var(--ink-400)" }}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Plantillas
      </Link>
      <p className="eyebrow mb-1">Editor de prompt</p>
      <h1 className="mb-2 font-mono text-[24px] font-black tracking-tight">
        {phaseId}
      </h1>
      <p className="mb-6 text-[13.5px] font-bold" style={{ color: "var(--warn-500)" }}>
        Los cambios aplican al siguiente mensaje de cualquier conversación.
      </p>
      <PromptEditor phaseId={phaseId} />
    </div>
  );
}
