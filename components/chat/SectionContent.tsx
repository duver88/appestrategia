"use client";

import type {
  Fase0Data,
  Fase05Data,
  Fase10Data,
  Fase11Data,
  Fase12Data,
  Fase13Data,
  Fase14Data,
  Fase15Data,
  Fase16Data,
  Fase17Data,
  Fase21Data,
  Fase22Data,
  Fase23Data,
  Fase24Data,
  Fase3Data,
  Fase4Data,
  Fase5Data,
  Fase6Data,
} from "@/lib/schemas";
import { FASE6_SEMANAS } from "@/lib/calendar/catalogs";
import { cn } from "@/lib/utils";

/** Renderizado bonito del contenido de una sección según su fase. */
export function SectionContent({
  phaseId,
  data,
  compact = false,
}: {
  phaseId: string;
  data: unknown;
  compact?: boolean;
}) {
  switch (phaseId) {
    case "fase_0":
      return <Fase0View data={data as Fase0Data} compact={compact} />;
    case "fase_0_5":
      return <Fase05View data={data as Fase05Data} />;
    case "fase_1_0":
      return <Fase10View data={data as Fase10Data} />;
    case "fase_1_1":
      return <Fase11View data={data as Fase11Data} compact={compact} />;
    case "fase_1_2":
      return <Fase12View data={data as Fase12Data} compact={compact} />;
    case "fase_1_3":
      return <Fase13View data={data as Fase13Data} compact={compact} />;
    case "fase_1_4":
      return <Fase14View data={data as Fase14Data} />;
    case "fase_1_5":
      return <Fase15View data={data as Fase15Data} />;
    case "fase_1_6":
      return <Fase16View data={data as Fase16Data} />;
    case "fase_1_7":
      return <Fase17View data={data as Fase17Data} />;
    case "fase_2_1":
      return <Fase21View data={data as Fase21Data} />;
    case "fase_2_2":
      return <Fase22View data={data as Fase22Data} />;
    case "fase_2_3":
      return <Fase23View data={data as Fase23Data} />;
    case "fase_2_4":
      return <Fase24View data={data as Fase24Data} />;
    case "fase_3":
      return <Fase3View data={data as Fase3Data} />;
    case "fase_4":
      return <Fase4View data={data as Fase4Data} />;
    case "fase_5":
      return <Fase5View data={data as Fase5Data} />;
    case "fase_6":
      return <Fase6View data={data as Fase6Data} compact={compact} />;
    default:
      return (
        <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-ink-600">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
  }
}

const EJE_LABEL: Record<string, string> = {
  CREENCIA_CONTRARIA: "Creencia contraria",
  PROCESO: "Proceso",
  RESULTADO: "Resultado",
  COMBINACION: "Combinación",
};

// Chips de uso (sistema): punto del color + texto navy sobre tinte al 12%.
const USO_CHIP: Record<string, { dot: string; bg: string }> = {
  ATRACCION: { dot: "#2EC27E", bg: "rgba(46,194,126,0.12)" },
  NUTRICION: { dot: "#8A63D2", bg: "rgba(138,99,210,0.12)" },
  CONVERSION: { dot: "#E5484D", bg: "rgba(229,72,77,0.12)" },
};

const USO_LABEL: Record<string, string> = {
  ATRACCION: "Atracción",
  NUTRICION: "Nutrición",
  CONVERSION: "Conversión",
};

function UsoBadge({ uso }: { uso: string }) {
  const chip = USO_CHIP[uso];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-extrabold text-navy-900"
      style={{ background: chip?.bg ?? "var(--surface-50)" }}
    >
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: chip?.dot ?? "var(--ink-400)" }}
      />
      {USO_LABEL[uso] ?? uso}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="py-1.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-400">
        {label}
      </dt>
      <dd className="text-sm text-navy-900">{value}</dd>
    </div>
  );
}

function Chips({ items, tone }: { items: string[]; tone?: "ok" | "bad" }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((w, i) => (
        <span
          key={i}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs",
            tone === "bad"
              ? "bg-[rgba(229,72,77,0.12)] text-danger-500"
              : "bg-surface-50 text-ink-600",
          )}
        >
          {w}
        </span>
      ))}
    </div>
  );
}

function Fase0View({ data, compact }: { data: Fase0Data; compact: boolean }) {
  return (
    <dl className={cn("divide-y divide-line-200", compact && "text-xs")}>
      <Row label="Qué vende" value={data.queVende} />
      <Row label="A quién" value={data.aQuienVende} />
      <Row label="Precio" value={data.precio} />
      <Row label="Resultado concreto" value={data.resultadoConcreto} />
      <Row
        label="Casos de éxito"
        value={
          data.casosExito.length > 0 ? (
            <ul className="list-disc pl-4">
              {data.casosExito.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          ) : (
            "Ninguno aún"
          )
        }
      />
      <Row label="Diferencia percibida" value={data.diferenciaPercibida} />
      {data.nombreMetodoExistente && (
        <Row label="Método existente" value={data.nombreMetodoExistente} />
      )}
      <Row label="País / mercado" value={data.paisMercado} />
      <Row
        label="Etapa"
        value={data.etapa === "EMPEZANDO" ? "Empezando" : "Escalando"}
      />
      <Row label="Tipo de perfiles" value={data.tipoPerfiles} />
      <Row label="Tiempo semanal" value={data.tiempoSemanal} />
      <Row label="Equipo de edición" value={data.equipoEdicion ? "Sí" : "No"} />
      <Row label="Persona visible" value={data.personaVisible} />
    </dl>
  );
}

function Fase05View({ data }: { data: Fase05Data }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-surface-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
          Eje de posicionamiento diagnosticado
        </p>
        <p className="text-base font-semibold text-navy-900">
          {EJE_LABEL[data.eje] ?? data.eje}
        </p>
      </div>
      <p className="text-sm text-ink-600">{data.justificacion}</p>
      {data.narrativaDominante && (
        <div className="rounded-lg border border-line-200 p-3 text-sm">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
            Narrativa dominante del mercado
          </p>
          {data.narrativaDominante}
        </div>
      )}
    </div>
  );
}

function Fase10View({ data }: { data: Fase10Data }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-600">{data.tonoDescripcion}</p>
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
          Frases reales del cliente
        </p>
        <ul className="space-y-1 text-sm italic text-ink-600">
          {data.frasesReales.map((f, i) => (
            <li key={i}>«{f}»</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
          Palabras frecuentes
        </p>
        <Chips items={data.palabrasFrecuentes} />
      </div>
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
          Palabras prohibidas
        </p>
        <Chips items={data.palabrasProhibidas} tone="bad" />
      </div>
    </div>
  );
}

function Fase11View({ data, compact }: { data: Fase11Data; compact: boolean }) {
  return (
    <div className="space-y-3">
      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
        {data.perfiles.map((p, i) => (
          <div key={i} className="rounded-lg border border-line-200 bg-white p-3">
            <p className="mb-1 font-semibold text-navy-900">{p.nombre}</p>
            <p className="mb-1 text-sm text-ink-600">{p.situacion}</p>
            <p className="text-sm">
              <span className="font-medium text-danger-500">Dolor:</span>{" "}
              {p.dolorPrincipal}
            </p>
            <p className="text-sm">
              <span className="font-medium text-teal-700">La impulsa:</span>{" "}
              {p.loQueLaImpulsa}
            </p>
            <p className="mt-1 text-sm italic text-ink-400">
              «{p.comoSeDescribe}»
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-surface-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
          Frase unificadora
        </p>
        <p className="text-sm font-medium text-navy-900">
          «{data.fraseUnificadora}»
        </p>
      </div>
      <p className="text-sm text-ink-400">Rango de edad: {data.rangoEdad}</p>
    </div>
  );
}

function Fase12View({ data, compact }: { data: Fase12Data; compact: boolean }) {
  return (
    <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-danger-500">
          Dolores
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-600">
          {data.dolores.map((d, i) => (
            <li key={i}>«{d}»</li>
          ))}
        </ol>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">
          Deseos
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-600">
          {data.deseos.map((d, i) => (
            <li key={i}>«{d}»</li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function Fase13View({ data, compact }: { data: Fase13Data; compact: boolean }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-surface-50 p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
          Promesa final
        </p>
        <p className="text-base font-semibold text-navy-900">
          «{data.promesaFinal}»
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-surface-50 px-2.5 py-1">
          Métrica: {data.componentes.metrica}
        </span>
        <span className="rounded-full bg-surface-50 px-2.5 py-1">
          Volumen: {data.componentes.volumen}
        </span>
        {data.componentes.tiempo && (
          <span className="rounded-full bg-surface-50 px-2.5 py-1">
            Tiempo: {data.componentes.tiempo}
          </span>
        )}
      </div>
      {!compact && (
        <details className="text-sm text-ink-600">
          <summary className="cursor-pointer text-ink-400">
            Ver las 10 opciones generadas
          </summary>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            {data.opciones.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}

function Fase14View({ data }: { data: Fase14Data }) {
  return (
    <div className="space-y-3">
      {data.diferenciadores.map((d, i) => (
        <div key={i} className="rounded-lg border border-line-200 bg-white p-3">
          <p className="mb-1 font-semibold text-navy-900">
            {i + 1}. {d.titulo}
          </p>
          <p className="text-sm text-ink-600">
            <span className="font-medium">Todo el mundo:</span> {d.todoElMundo}
          </p>
          <p className="text-sm text-ink-600">
            <span className="font-medium text-danger-500">El problema:</span>{" "}
            {d.problema}
          </p>
          <p className="text-sm text-ink-600">
            <span className="font-medium text-ink-400">En cambio:</span>{" "}
            {d.enCambio}
          </p>
          <p className="text-sm text-ink-600">
            <span className="font-medium">Para que:</span> {d.paraQue}
          </p>
        </div>
      ))}
    </div>
  );
}

function Fase15View({ data }: { data: Fase15Data }) {
  return (
    <ol className="space-y-2">
      {data.etapas
        .slice()
        .sort((a, b) => a.numero - b.numero)
        .map((e) => (
          <li key={e.numero} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-extrabold text-white">
              {e.numero}
            </span>
            <div>
              <p className="font-medium text-navy-900">{e.nombre}</p>
              <p className="text-sm text-ink-600">{e.descripcion}</p>
            </div>
          </li>
        ))}
    </ol>
  );
}

function Fase16View({ data }: { data: Fase16Data }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-surface-50 p-4">
        <p className="text-base font-semibold text-navy-900">{data.nombre}</p>
        <p className="text-sm italic text-ink-400">{data.tagline}</p>
      </div>
      <div className="space-y-2">
        {data.fases.map((f, i) => (
          <div key={i} className="rounded-lg border border-line-200 p-3">
            <p className="font-medium text-navy-900">
              Fase {i + 1}: {f.nombre}
            </p>
            <p className="text-sm text-ink-600">
              <span className="font-medium">Qué hace:</span> {f.queHace}
            </p>
            <p className="text-sm text-ink-600">
              <span className="font-medium">Qué produce:</span> {f.queProduce}
            </p>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-zinc-50 p-3 text-sm text-ink-600">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
          Elevator pitch
        </p>
        «{data.elevatorPitch}»
      </div>
    </div>
  );
}

function Fase17View({ data }: { data: Fase17Data }) {
  return (
    <div className="space-y-3">
      {data.entregables.map((e, i) => (
        <div key={i} className="rounded-lg border border-line-200 bg-white p-3">
          <p className="mb-1 font-semibold text-navy-900">{e.nombre}</p>
          <p className="text-sm text-ink-600">
            <span className="font-medium">Funcional:</span> {e.funcional}
          </p>
          <p className="text-sm text-ink-600">
            <span className="font-medium">Emocional:</span> {e.emocional}
          </p>
          <p className="text-sm text-ink-600">
            <span className="font-medium">Dimensional:</span> {e.dimensional}
          </p>
        </div>
      ))}
    </div>
  );
}

function Fase21View({ data }: { data: Fase21Data }) {
  const creencia =
    data.tipo === "CREENCIA_CONTRARIA" || data.tipo === "COMBINACION";
  const proceso = data.tipo === "PROCESO" || data.tipo === "COMBINACION";
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-surface-50 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
          Tipo de eje
        </p>
        <p className="font-semibold text-navy-900">
          {EJE_LABEL[data.tipo] ?? data.tipo}
        </p>
      </div>
      {creencia && (
        <dl className="divide-y divide-line-200">
          <Row label="Narrativa dominante" value={data.narrativaDominante} />
          <Row label="Versión agresiva" value={`«${data.versionAgresiva}»`} />
          <Row label="Versión consultiva" value={`«${data.versionConsultiva}»`} />
          <Row label="Tesis unificada" value={`«${data.tesisUnificada}»`} />
          {"reglaEjecucion" in data && data.reglaEjecucion && (
            <Row
              label="Regla de ejecución — Pairing × Consistencia"
              value={data.reglaEjecucion}
            />
          )}
          {"senalesDeExito" in data && data.senalesDeExito && (
            <Row
              label="Señal de que funciona"
              value={data.senalesDeExito.map((s, i) => (
                <span key={i} className="block italic">«{s}»</span>
              ))}
            />
          )}
        </dl>
      )}
      {proceso && (
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
            Versiones por proceso
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-600">
            {data.versiones.map((v, i) => (
              <li key={i}>«{v}»</li>
            ))}
          </ol>
        </div>
      )}
      {data.tipo === "RESULTADO" && (
        <p className="text-sm text-ink-600">
          El posicionamiento se sostiene en resultados: los casos y métricas
          concretos viven en el Credibility Bank (Paso 2.4).
        </p>
      )}
    </div>
  );
}

function Fase22View({ data }: { data: Fase22Data }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-surface-50 p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-400">
          Brand Statement principal
        </p>
        <p className="text-base font-semibold text-navy-900">
          «{data.principal}»
        </p>
      </div>
      <dl className="divide-y divide-line-200">
        <Row label="Versión agresiva" value={`«${data.agresivo}»`} />
        <Row label="Versión comercial" value={`«${data.comercial}»`} />
      </dl>
    </div>
  );
}

function Fase23View({ data }: { data: Fase23Data }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-600">
      {data.tesis.map((t, i) => (
        <li key={i}>«{t}»</li>
      ))}
    </ol>
  );
}

function Fase24View({ data }: { data: Fase24Data }) {
  return (
    <div className="space-y-3">
      {data.casos.map((c, i) => (
        <div
          key={i}
          className={cn(
            "rounded-lg border bg-white p-3",
            c.esPlaceholder ? "border-dashed border-warn-500" : "border-line-200",
          )}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="font-semibold text-navy-900">{c.tema}</p>
            {c.esPlaceholder && (
              <span className="shrink-0 rounded-full bg-[rgba(245,165,36,0.12)] px-2 py-0.5 text-[11px] font-medium text-warn-500">
                Por completar
              </span>
            )}
          </div>
          <p className="text-sm text-ink-600">{c.casoReal}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-surface-50 px-2.5 py-1">
              Métrica: {c.metrica}
            </span>
            <span className="rounded-full bg-surface-50 px-2.5 py-1">
              Resultado: {c.resultado}
            </span>
            <span className="rounded-full bg-surface-50 px-2.5 py-1">
              Tiempo: {c.tiempo}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Fase3View({ data }: { data: Fase3Data }) {
  return (
    <div className="space-y-3">
      {data.deseos.map((d, i) => (
        <div key={i} className="rounded-lg border border-line-200 bg-white p-3">
          <p className="font-semibold text-navy-900">{d.nombre}</p>
          <p className="text-xs uppercase tracking-wide text-ink-400">
            Deseo Reiss: {d.nombreReiss}
          </p>
          <p className="mt-1 text-sm text-ink-600">{d.explicacion}</p>
        </div>
      ))}
    </div>
  );
}

function Fase4View({ data }: { data: Fase4Data }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-line-200 text-xs uppercase tracking-wide text-ink-400">
            <th className="py-2 pr-3">#</th>
            <th className="py-2 pr-3">Hook</th>
            <th className="py-2 pr-3">Deseo</th>
            <th className="py-2 pr-3">Perfil</th>
            <th className="py-2 pr-3">Nivel</th>
            <th className="py-2 pr-3">Ángulo</th>
            <th className="py-2">Uso</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-200">
          {data.hooks.map((h, i) => (
            <tr key={i} className="align-top">
              <td className="py-2 pr-3 text-ink-400">{i + 1}</td>
              <td className="py-2 pr-3 font-medium text-navy-900">«{h.hook}»</td>
              <td className="py-2 pr-3 text-ink-600">{h.deseo}</td>
              <td className="py-2 pr-3 text-ink-600">{h.perfil}</td>
              <td className="py-2 pr-3 text-ink-600">{h.nivel}</td>
              <td className="py-2 pr-3 text-ink-600">
                {h.angulo === "DOLOR" ? "Dolor" : "Ganancia"}
              </td>
              <td className="py-2">
                <UsoBadge uso={h.uso} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Fase5View({ data }: { data: Fase5Data }) {
  return (
    <div className="space-y-3">
      {data.magnets.map((m, i) => (
        <div key={i} className="rounded-lg border border-line-200 bg-white p-3">
          <p className="font-semibold text-navy-900">
            {m.codigo} — {m.titulo}
          </p>
          <p className="text-xs uppercase tracking-wide text-ink-400">
            {m.formato} · Días {m.diasAplica.join(", ")}
          </p>
          <p className="mt-1 text-sm text-ink-600">{m.porQueLoQuiere}</p>
          <p className="mt-1 text-sm text-ink-600">
            <span className="font-medium">CTA:</span> «{m.ctaExacto}»
          </p>
        </div>
      ))}
    </div>
  );
}

function Fase6View({ data, compact }: { data: Fase6Data; compact: boolean }) {
  const dias = [...data.dias].sort((a, b) => a.dia - b.dia);
  // Ajuste #3 (A4.4): troceo por FASE6_SEMANAS (7/7/7/10) — la semana 4
  // absorbe los días 22-31; nunca existe una "Semana 5".
  const semanas = FASE6_SEMANAS.map(([from, to]) =>
    dias.filter((d) => d.dia >= from && d.dia <= to),
  );
  return (
    <div className="space-y-4">
      <div
        className={cn(
          "rounded-lg p-3",
          data.fomo.confirmedByClient ? "bg-surface-50" : "bg-[rgba(245,165,36,0.12)]",
        )}
      >
        <p
          className={cn(
            "text-xs font-medium uppercase tracking-wide",
            data.fomo.confirmedByClient ? "text-ink-400" : "text-warn-500",
          )}
        >
          FOMO del mes ({data.fomo.tipo})
          {data.fomo.confirmedByClient
            ? " · confirmado"
            : data.fomo.estado === "PENDIENTE_BRACKETS"
              ? " · brackets pendientes del cliente"
              : " · SIN CONFIRMAR"}
        </p>
        <p className="text-sm text-navy-900">{data.fomo.descripcion}</p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-ink-600">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-green-500" /> Atracción
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-purple-500" /> Nutrición
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-danger-500" /> Conversión
        </span>
      </div>

      {semanas.map((semana, si) => (
        <div key={si}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Semana {si + 1}
            {data.etiquetasSemana?.[si]
              ? ` — ${data.etiquetasSemana[si]}`
              : si === 3
                ? " — FOMO del mes"
                : ""}
          </p>
          <div className={cn("grid gap-2", !compact && "sm:grid-cols-2")}>
            {semana.map((d) => (
              <div
                key={d.dia}
                className="rounded-lg border border-line-200 bg-white p-2.5"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-ink-400">
                    Día {d.dia} · {d.diaSemana}
                  </p>
                  <UsoBadge uso={d.uso} />
                </div>
                <p className="text-sm font-medium text-navy-900">«{d.hook}»</p>
                <p className="text-xs text-ink-600">{d.ideaCentral}</p>
                <p className="mt-1 text-[11px] text-ink-400">
                  {d.angulo} · {d.formato}
                  {d.persona ? ` — ${d.persona}` : ""}
                  {d.magnet ? ` · Magnet: ${d.magnet}` : ""}
                </p>
                <p className="text-[11px] text-ink-400">CTA: {d.cta}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
