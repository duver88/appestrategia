// DIAGNÓSTICO fase_6 — reproducción real con métricas de UI y de stream.
// Solo observa: no modifica código de producto.
const { PrismaClient } = require("@prisma/client");
const puppeteer = require("puppeteer");

const prisma = new PrismaClient();
const BASE = "http://localhost:3000";
const EMAIL = "diag-fase6@test.local";
const PASS = "diag-pass-1234";
const TIMEOUT_MS = 7 * 60 * 1000;

const MSG =
  "Confirmo el FOMO del mes: quedan solo 5 cupos de la mentoría de julio (tipo: cupos limitados), confirmedByClient: true. Y confirmo los CTAs canónicos del proyecto: primario 'Comenta YO' y secundario 'Escríbeme SISTEMA'. Genera ya el calendario completo de los 31 días, sin preguntarme nada más.";

(async () => {
  const project = await prisma.project.findFirst({
    where: { title: "Diagnóstico fase_6" },
  });
  const t0 = Date.now();

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 860 });

  // Login
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.type('input[type="email"]', EMAIL);
  await page.type('input[type="password"]', PASS);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
  ]);
  await page.goto(`${BASE}/project/${project.id}`, { waitUntil: "networkidle2" });

  // Instrumentación EN la página: tee del stream + jank de UI.
  await page.evaluate(() => {
    const d = (window.__diag = {
      chunks: 0,
      bytes: 0,
      toolStarts: 0,
      toolDeltas: 0,
      textDeltas: 0,
      errors: [],
      finishes: 0,
      firstByteMs: null,
      streamEndMs: null,
      sentAt: null,
      longTasks: 0,
      longTaskTotalMs: 0,
      worstTaskMs: 0,
      rafGapsOver500: 0,
      worstRafGapMs: 0,
      stateUpdates: 0,
      toolOutputs: [],
      okFlags: [],
    });
    // Huecos entre frames: si superan 500ms, el tab estuvo congelado.
    let last = performance.now();
    const loop = (now) => {
      const gap = now - last;
      if (gap > 500) {
        d.rafGapsOver500++;
        if (gap > d.worstRafGapMs) d.worstRafGapMs = Math.round(gap);
      }
      last = now;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    try {
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          d.longTasks++;
          d.longTaskTotalMs += e.duration;
          if (e.duration > d.worstTaskMs) d.worstTaskMs = Math.round(e.duration);
        }
      }).observe({ entryTypes: ["longtask"] });
    } catch {}

    const origFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url ?? "";
      const res = await origFetch(...args);
      if (!url.includes("/api/chat") || !res.body) return res;
      d.sentAt = performance.now();
      const clone = res.clone();
      (async () => {
        const reader = clone.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (d.firstByteMs === null) d.firstByteMs = Math.round(performance.now() - d.sentAt);
          d.chunks++;
          d.bytes += value.byteLength;
          const text = dec.decode(value, { stream: true });
          d.toolStarts += (text.match(/tool-input-start/g) || []).length;
          d.toolDeltas += (text.match(/tool-input-delta/g) || []).length;
          d.textDeltas += (text.match(/"type":"text-delta"/g) || []).length;
          d.finishes += (text.match(/"type":"finish"/g) || []).length;
          const errs = text.match(/"errorText":"([^"]{0,180})/g) || [];
          for (const e of errs) if (d.errors.length < 6) d.errors.push(e.slice(0, 180));
          // Resultados de la tool (incluye {ok:false, errors:[...]} del validador)
          const outs = text.match(/"errors":\[[^\]]{0,400}\]/g) || [];
          for (const o of outs) if (d.toolOutputs.length < 8) d.toolOutputs.push(o.slice(0, 420));
          const oks = text.match(/\\"ok\\":(true|false)|"ok":(true|false)/g) || [];
          for (const o of oks) d.okFlags.push(o);
          d.progressParts = (d.progressParts || 0) + (text.match(/fase6-progress/g) || []).length;
        }
        d.streamEndMs = Math.round(performance.now() - d.sentAt);
      })();
      return res;
    };
  });

  // Enviar el mensaje (espera a que la página del chat compile/cargue).
  await page.waitForSelector("textarea", { timeout: 90000 });
  await page.click("textarea");
  await page.type("textarea", MSG);
  await page.keyboard.press("Enter");
  console.log("mensaje enviado; esperando generación (máx 7 min)...");

  // Esperar fin: borrador DRAFT en DB, banner de error, o timeout.
  let outcome = "TIMEOUT";
  let shotTaken = false;
  while (Date.now() - t0 < TIMEOUT_MS) {
    if (!shotTaken) {
      const hasProgress = await page.evaluate(
        () => (window.__diag.progressParts || 0) > 0,
      );
      if (hasProgress) {
        const fs = require("fs");
        fs.mkdirSync("tmp-shots", { recursive: true });
        await new Promise((r) => setTimeout(r, 1200));
        await page.screenshot({ path: "tmp-shots/fase6-progreso.png" });
        shotTaken = true;
        console.log("screenshot del progreso capturado");
      }
    }
    const diag = await page.evaluate(() => ({
      end: window.__diag.streamEndMs,
      errs: window.__diag.errors.length,
    }));
    const draft = await prisma.section.findUnique({
      where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_6" } },
    });
    if (draft) {
      outcome = `DRAFT creado (status=${draft.status})`;
      if (diag.end !== null) break;
    }
    if (diag.end !== null && !draft) {
      outcome = "stream terminó SIN borrador";
      break;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Pequeña espera para drenar métricas y captura final.
  await new Promise((r) => setTimeout(r, 2000));
  const diag = await page.evaluate(() => window.__diag);
  const totalS = ((Date.now() - t0) / 1000).toFixed(1);

  const errorBanner = await page.evaluate(() => {
    const el = document.querySelector('[role="alert"]');
    return el ? el.textContent.slice(0, 160) : null;
  });

  console.log("\n===== RESULTADO REPRODUCCIÓN =====");
  console.log(`outcome: ${outcome} · tiempo total: ${totalS}s`);
  console.log(`banner de error visible: ${errorBanner ?? "no"}`);
  console.log("\n— Stream /api/chat (tee en el navegador) —");
  console.log(`primer byte: ${diag.firstByteMs}ms · fin de stream: ${diag.streamEndMs ?? "NO TERMINÓ"}ms`);
  console.log(`chunks: ${diag.chunks} · bytes: ${diag.bytes}`);
  console.log(`intentos de tool (tool-input-start): ${diag.toolStarts}`);
  console.log(`tool-input-delta (parses potenciales en UI): ${diag.toolDeltas}`);
  console.log(`text-delta: ${diag.textDeltas} · finish parts: ${diag.finishes}`);
  console.log(`errores en stream: ${JSON.stringify(diag.errors, null, 1)}`);
  console.log(`flags ok de la tool: ${JSON.stringify(diag.okFlags)}`);
  console.log(`salidas del validador: ${JSON.stringify(diag.toolOutputs, null, 1)}`);
  console.log("\n— Congelamiento del tab —");
  console.log(`longtasks (>50ms): ${diag.longTasks} · total bloqueado: ${Math.round(diag.longTaskTotalMs)}ms · peor tarea: ${diag.worstTaskMs}ms`);
  console.log(`huecos rAF >500ms: ${diag.rafGapsOver500} · peor hueco: ${diag.worstRafGapMs}ms`);

  const draft = await prisma.section.findUnique({
    where: { projectId_phaseId: { projectId: project.id, phaseId: "fase_6" } },
  });
  if (draft) {
    const data = JSON.parse(draft.data);
    console.log(`\nBorrador en DB: ${data.dias?.length ?? "?"} días · status=${draft.status}`);
    if (data.dias?.length === 31 && draft.status === "DRAFT") {
      const ang = new Set(data.dias.map((x) => x.angulo));
      const fmt = new Set(data.dias.map((x) => x.formato));
      const conTildes = /[áéíóúñ¿¡]/.test(JSON.stringify(data.dias));
      console.log(
        `calidad: angulos=${ang.size} formatos=${fmt.size} tildes=${conTildes ? "SÍ" : "NO"} etiquetas=${data.etiquetasSemana?.length ?? 0} ctas=${data.ctas?.primario ?? "—"}/${data.ctas?.secundario ?? "—"}`,
      );
      // Regresión de oro: aprobar y producir el PDF real de muestra.
      await prisma.section.update({
        where: { id: draft.id },
        data: { status: "APPROVED", approvedAt: new Date() },
      });
      const pdfB64 = await page.evaluate(async (pid) => {
        const r = await fetch(`/api/pdf/${pid}`);
        if (!r.ok) return `ERROR ${r.status}: ${await r.text()}`;
        const buf = await r.arrayBuffer();
        let bin = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        return btoa(bin);
      }, project.id);
      if (pdfB64.startsWith("ERROR")) {
        console.log("PDF:", pdfB64.slice(0, 200));
      } else {
        const fs = require("fs");
        fs.writeFileSync("storage/pdfs/muestra-calidad.pdf", Buffer.from(pdfB64, "base64"));
        console.log(`PDF de muestra: storage/pdfs/muestra-calidad.pdf (${Buffer.from(pdfB64, "base64").length} bytes)`);
      }
    }
  } else {
    console.log("\nSin borrador fase_6 en DB.");
  }

  await browser.close();
  await prisma.$disconnect();
})();
