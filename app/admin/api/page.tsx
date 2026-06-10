import { CredentialsPanel } from "@/components/admin/CredentialsPanel";

export const dynamic = "force-dynamic";

export default function AdminApiPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="eyebrow mb-1">Panel · API y modelos</p>
      <h1 className="mb-8 text-[30px] font-black tracking-tight">
        Proveedores de IA
      </h1>
      <CredentialsPanel />
    </div>
  );
}
