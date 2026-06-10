import { SettingsForm } from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow mb-1">Panel · Configuración</p>
      <h1 className="mb-8 text-[30px] font-black tracking-tight">
        Configuración general
      </h1>
      <SettingsForm />
    </div>
  );
}
