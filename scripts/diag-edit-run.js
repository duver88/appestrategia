// DIAGNÓSTICO del flujo de edición vía chat (bug reportado por el owner).
// Crea DOS proyectos de prueba con una propuesta DRAFT existente y pide un
// cambio por chat, capturando: tool calls del stream, payloads/respuestas
// de la tool, texto del asistente y diff de la Section en DB.
//   Escenario A (fase_1_4): edición benigna — cambiar un título.
//   Escenario B (fase_4): edición que DISPARA el validador de cifras (A1).
// Solo datos de prueba; no toca código de producto.
const { PrismaClient } = require("@prisma/client");
const puppeteer = require("puppeteer");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();
const BASE = "http://localhost:3000";
const EMAIL = "diag-edit@test.local";
const PASS = "diag-pass-1234";

// Secciones del seed e2e (formas válidas por schema).
const seedSrc = fs.readFileSync(path.join(__dirname, "e2e-seed.js"), "utf8");
const cut = seedSrc.indexOf("async function clean");
const dataSrc = seedSrc
  .slice(0, cut)
  .replace(/const \{ PrismaClient \}[\s\S]*?bcryptjs"\);/, "")
  .replace(/const prisma = new PrismaClient\(\);/, "");
const SECTIONS = new Function(`${dataSrc}; return SECTIONS;`)();

const ORDER = [
  "fase_0", "fase_0_5", "fase_1_0", "fase_1_1", "fase_1_2", "fase_1_3",
  "fase_1_4", "fase_1_5", "fase_1_6", "fase_1_7", "fase_2_1", "fase_2_2",
  "fase_2_3", "fase_2_4", "fase_3", "fase_4", "fase_5", "fase_6",
];

async function makeProject(clientId, currentPhase, draftData) {
  const prior = ORDER.slice(0, ORDER.indexOf(currentPhase));
  const project = await prisma.project.create({
    data: {
      clientId,
      title: `Diag edición ${currentPhase}`,
      mode: "MODO_1",
      currentPhase,
      modelProvider: "deepseek:deepseek-chat",
      sections: {
        create: [
          ...prior.map((phaseId) => ({
            phaseId,
            data: JSON.stringify(SECTIONS[phaseId]),
            status: "APPROVED",
            approvedAt: new Date(),
          })),
          {
            phaseId: currentPhase,
            data: JSON.stringify(draftData),
            status: "DRAFT",
          },
        ],
      },
      messages: {
        create: {
          phaseId: currentPhase,
          role: "assistant",
          content:
            "Aquí está mi propuesta para esta fase — revisa la tarjeta y dime si quieres ajustar algo antes de aprobar.",
        },
      },
    },
  });
  return project;
}

async function runScenario(page, project, msg) {
  const before = await prisma.section.findUnique({
    where: { projectId_phaseId: { projectId: project.id, phaseId: project.currentPhase } },
  });
  await page.goto(`${BASE}/project/${project.id}`, { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    const d = (window.__diag = { toolStarts: 0, toolOutputs: [], okFlags: [], textos: [] });
    const orig = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url ?? "";
      const res = await orig(...args);
      if (!url.includes("/api/chat") || !res.body) return res;
      const clone = res.clone();
      (async () => {
        const reader = clone.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
        }
        d.toolStarts = (buf.match(/tool-input-start/g) || []).length;
        d.okFlags = buf.match(/\\"ok\\":(true|false)|"ok":(true|false)/g) || [];
        d.toolOutputs = (buf.match(/"errors":\[[^\]]{0,500}\]/g) || []).map((x) => x.slice(0, 500));
        // payload de la tool (inputs delta concatenados es ruidoso; capturamos el output)
        const outs = buf.match(/"output":\{[^\n]{0,400}/g) || [];
        for (const o of outs) d.toolOutputs.push(o.slice(0, 400));
        // texto visible del asistente
        for (const m of buf.matchAll(/"type":"text-delta","id":"[^"]*","delta":"((?:[^"\\]|\\.)*)"/g)) {
          d.textos.push(m[1]);
        }
        d.fin = true;
      })();
      return res;
    };
  });
  await page.waitForSelector("textarea", { timeout: 90000 });
  await page.click("textarea");
  await page.type("textarea", msg);
  await page.keyboard.press("Enter");
  // Esperar fin del stream (máx 3 min)
  const t0 = Date.now();
  while (Date.now() - t0 < 180000) {
    const fin = await page.evaluate(() => window.__diag.fin === true);
    if (fin) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  await new Promise((r) => setTimeout(r, 1500));
  const diag = await page.evaluate(() => window.__diag);
  const after = await prisma.section.findUnique({
    where: { projectId_phaseId: { projectId: project.id, phaseId: project.currentPhase } },
  });
  const texto = diag.textos
    .join("")
    .replace(/\\n/g, " ")
    .replace(/\\"/g, '"');
  return { before, after, diag, texto };
}

function report(nombre, r, campo) {
  console.log(`\n===== ${nombre} =====`);
  console.log(`tool calls (tool-input-start): ${r.diag.toolStarts}`);
  console.log(`flags ok de la tool: ${JSON.stringify(r.diag.okFlags)}`);
  console.log(`salidas de la tool/validador:`);
  for (const o of r.diag.toolOutputs.slice(0, 4)) console.log(`  ${o}`);
  console.log(`texto del asistente (visible en UI): «${r.texto.slice(0, 400)}»`);
  const b = JSON.parse(r.before.data);
  const a = JSON.parse(r.after.data);
  console.log(`DB antes  → ${campo}: ${JSON.stringify(campo.split(".").reduce((x, k) => x?.[k], b))?.slice(0, 120)}`);
  console.log(`DB después→ ${campo}: ${JSON.stringify(campo.split(".").reduce((x, k) => x?.[k], a))?.slice(0, 120)}`);
  console.log(`¿La sección cambió en DB?: ${r.before.data === r.after.data ? "NO (idéntica)" : "SÍ"}`);
  console.log(`status: ${r.before.status} → ${r.after.status} · updatedAt: ${r.before.updatedAt.toISOString()} → ${r.after.updatedAt.toISOString()}`);
}

(async () => {
  // Limpieza idempotente del cliente de diagnóstico de edición.
  const old = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (old?.clientId) {
    const ps = await prisma.project.findMany({ where: { clientId: old.clientId } });
    for (const p of ps) {
      await prisma.message.deleteMany({ where: { projectId: p.id } });
      await prisma.section.deleteMany({ where: { projectId: p.id } });
      await prisma.usageLog.deleteMany({ where: { projectId: p.id } });
    }
    await prisma.user.delete({ where: { id: old.id } });
    await prisma.project.deleteMany({ where: { clientId: old.clientId } });
    await prisma.client.delete({ where: { id: old.clientId } });
  }
  const client = await prisma.client.create({
    data: {
      name: "Diag Edición",
      business: "Mentoría fitness (diagnóstico)",
      membershipExpiresAt: new Date(Date.now() + 30 * 86400000),
    },
  });
  await prisma.user.create({
    data: {
      email: EMAIL,
      name: "Diag Edición",
      passwordHash: await bcrypt.hash(PASS, 12),
      role: "CLIENT",
      clientId: client.id,
    },
  });

  const pA = await makeProject(client.id, "fase_1_4", SECTIONS.fase_1_4);
  const pB = await makeProject(client.id, "fase_4", SECTIONS.fase_4);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 860 });
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.type('input[type="email"]', EMAIL);
  await page.type('input[type="password"]', PASS);
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }),
  ]);

  const rA = await runScenario(
    page,
    pA,
    "Cambia el título del primer diferenciador a 'Coaching de verdad, no rutinas'. Solo eso, lo demás queda igual.",
  );
  report("ESCENARIO A — edición benigna (fase_1_4, cambiar un título)", rA, "diferenciadores.0.titulo");

  const rB = await runScenario(
    page,
    pB,
    "Cambia el hook número 1 de la matriz a: 'Este mes agendamos 18 citas automáticas para un entrenador como tú.' Lo demás queda igual.",
  );
  report("ESCENARIO B — edición que dispara el validador A1 (fase_4, cifra inventada)", rB, "hooks.0.hook");

  // ESCENARIO C — pedir editar una sección de una fase YA APROBADA (la
  // regla 14 impide al chat operar fuera de la fase actual; la regla 19
  // exige honestidad con el camino real, jamás narrar éxito).
  const pC = await makeProject(client.id, "fase_1_5", SECTIONS.fase_1_5);
  const rC = await runScenario(
    page,
    pC,
    "Quiero cambiar algo de una sección anterior: en los diferenciadores (que ya aprobé), cambia el título del primero a 'Coaching sin humo'. Hazlo ya.",
  );
  report("ESCENARIO C — edición de fase APROBADA (fase_1_4 desde fase_1_5)", rC, "etapas.0.nombre");
  const f14C = await prisma.section.findUnique({
    where: { projectId_phaseId: { projectId: pC.id, phaseId: "fase_1_4" } },
  });
  console.log(
    `fase_1_4 APROBADA intacta: ${JSON.parse(f14C.data).diferenciadores[0].titulo === SECTIONS.fase_1_4.diferenciadores[0].titulo ? "SÍ" : "NO — FUE MODIFICADA"} · status=${f14C.status}`,
  );

  await browser.close();
  await prisma.$disconnect();
})();
