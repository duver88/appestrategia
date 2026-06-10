// Seed de prueba e2e: cliente A con proyecto completo (18 secciones APPROVED,
// listo para PDF) y cliente B con proyecto vacío (para probar aislamiento).
// Uso: node scripts/e2e-seed.js  → imprime JSON con ids y credenciales.
// Limpieza: node scripts/e2e-seed.js --clean
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const EMAIL_A = "cliente-e2e@test.local";
const EMAIL_B = "otro-e2e@test.local";
const PASS = "demo-pass-1234";

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const USOS = ["ATRACCION", "NUTRICION", "CONVERSION"];

function calendario() {
  const dias = [];
  for (let i = 0; i < 31; i++) {
    dias.push({
      dia: i + 1,
      diaSemana: DIAS_SEMANA[i % 7],
      angulo: `Ángulo ${1 + (i % 12)}`,
      uso: USOS[i % 3],
      formato: `Formato ${1 + (i % 11)}`,
      hook: `Hook de prueba número ${i + 1} para validar el calendario`,
      ideaCentral: `Idea central del día ${i + 1}: desarrollo de la tesis con ejemplo práctico.`,
      magnet: i % 6 === 0 ? "OM1" : null,
      cta: i % 3 === 2 ? "Escríbeme «PLAN» por mensaje directo" : "Comenta «GUÍA» y te la envío",
    });
  }
  return {
    fomo: {
      descripcion: "Solo quedan 5 cupos de la mentoría de marzo",
      tipo: "Cupos limitados",
      confirmedByClient: true,
    },
    dias,
    verificacion: {
      angulosDistintos: 12,
      formatosDistintos: 11,
      fomoConfirmado: true,
      pruebaSocialConCasos: true,
    },
  };
}

const SECTIONS = {
  fase_0: {
    queVende: "Mentoría de ventas para entrenadores personales",
    aQuienVende: "Entrenadores personales que quieren vivir de clientes online",
    precio: "997 USD",
    resultadoConcreto: "Llegar a 10 clientes online recurrentes",
    casosExito: ["Carlos pasó de 2 a 11 clientes en 90 días"],
    diferenciaPercibida: "Acompañamiento diario, no un curso grabado",
    nombreMetodoExistente: null,
    paisMercado: "España y Latinoamérica",
    etapa: "ESCALANDO",
    tipoPerfiles: "Entrenadores con marca personal incipiente",
    tiempoSemanal: "6 horas",
    equipoEdicion: false,
    personaVisible: "COMPLETA",
  },
  fase_0_5: {
    eje: "CREENCIA_CONTRARIA",
    justificacion: "El mercado vende rutinas; el negocio real es la captación.",
    narrativaDominante: "Para tener clientes hay que publicar rutinas y transformaciones.",
  },
  fase_1_0: {
    frasesReales: [
      "esto no va de entrenar más duro",
      "tu cuerpo es tu currículum, pero no tu negocio",
      "deja de regalar rutinas",
      "el gimnasio te queda pequeño",
      "vende resultados, no horas",
    ],
    tonoDescripcion: "Directo, retador, de colega a colega, sin tecnicismos.",
    palabrasFrecuentes: ["cliente", "vivir de esto", "online", "sistema"],
    palabrasProhibidas: ["fitness lover", "no pain no gain", "emprendimiento"],
  },
  fase_1_1: {
    perfiles: [
      { nombre: "El saturado de gimnasio", situacion: "Trabaja 10 horas en sala", dolorPrincipal: "No tiene tiempo ni energía", loQueLaImpulsa: "Libertad horaria", comoSeDescribe: "Vivo para el gym pero el gym no me da para vivir" },
      { nombre: "La recién certificada", situacion: "Acaba de certificarse", dolorPrincipal: "No sabe conseguir clientes", loQueLaImpulsa: "Demostrar que puede", comoSeDescribe: "Tengo el título pero no los clientes" },
      { nombre: "El influencer estancado", situacion: "Tiene seguidores sin ingresos", dolorPrincipal: "Likes que no pagan facturas", loQueLaImpulsa: "Monetizar su audiencia", comoSeDescribe: "Me siguen pero no me compran" },
      { nombre: "La que volvió", situacion: "Retoma tras maternidad", dolorPrincipal: "Perdió su cartera de clientes", loQueLaImpulsa: "Reconstruir sin volver a sala", comoSeDescribe: "Quiero volver pero a mi manera" },
      { nombre: "El escéptico digital", situacion: "Buen profesional, mal vendedor", dolorPrincipal: "Cree que vender online es humo", loQueLaImpulsa: "Ver método serio", comoSeDescribe: "Yo soy entrenador, no vendedor" },
    ],
    fraseUnificadora: "Entrenadores que quieren vivir de esto sin vivir en el gimnasio",
    rangoEdad: "25-40",
  },
  fase_1_2: {
    dolores: [
      "Trabajo más horas que nunca y gano lo mismo",
      "No sé qué publicar para que me salgan clientes",
      "Regalo asesorías que nadie valora",
      "Mis seguidores me felicitan pero no me compran",
      "Dependo del gimnasio y de sus horarios",
      "Veo a peores entrenadores ganando más que yo",
      "Me da vergüenza venderme",
      "No tengo sistema, voy improvisando",
      "Cada mes empiezo de cero buscando clientes",
      "Siento que mi título no sirvió para nada",
    ],
    deseos: [
      "Quiero despertarme con mensajes de clientes nuevos",
      "Quiero cobrar lo que valgo sin negociar",
      "Quiero trabajar desde donde quiera",
      "Quiero una agenda llena sin perseguir a nadie",
      "Quiero que me vean como el referente de mi ciudad",
      "Quiero vivir de 10 buenos clientes, no de 40 sueltos",
      "Quiero un negocio, no un trabajo disfrazado",
      "Quiero tiempo para entrenar yo",
      "Quiero demostrarle a mi familia que esto es serio",
      "Quiero dejar el gimnasio sin miedo",
    ],
  },
  fase_1_3: {
    opciones: Array.from({ length: 10 }, (_, i) => `Opción de promesa ${i + 1}`),
    promesaFinal: "Te ayudo a conseguir 10 clientes online recurrentes en 90 días sin regalar rutinas",
    componentes: { metrica: "clientes online recurrentes", volumen: "10", tiempo: "90 días" },
  },
  fase_1_4: {
    diferenciadores: Array.from({ length: 6 }, (_, i) => ({
      titulo: `Diferenciador ${i + 1}`,
      todoElMundo: "Publica rutinas y transformaciones",
      problema: "Atrae curiosos que quieren contenido gratis",
      enCambio: "Construimos contenido que filtra y vende",
      paraQue: "Para que lleguen clientes listos para pagar",
    })),
  },
  fase_1_5: {
    etapas: Array.from({ length: 7 }, (_, i) => ({
      numero: i + 1,
      nombre: `Etapa ${i + 1}`,
      descripcion: `Descripción de la etapa ${i + 1} del recorrido del cliente.`,
    })),
  },
  fase_1_6: {
    nombre: "Método Cliente Imán",
    tagline: "De entrenador invisible a agenda llena en 90 días",
    fases: [
      { nombre: "Posicionar", queHace: "Define tu ángulo y tu nicho", queProduce: "Perfil que filtra curiosos" },
      { nombre: "Atraer", queHace: "Sistema de contenido diario", queProduce: "Flujo constante de interesados" },
      { nombre: "Convertir", queHace: "Guiones de venta sin presión", queProduce: "Clientes recurrentes" },
    ],
    elevatorPitch: "Ayudo a entrenadores a conseguir 10 clientes online recurrentes en 90 días con el Método Cliente Imán.",
  },
  fase_1_7: {
    entregables: [
      { nombre: "Sesiones semanales 1:1", funcional: "Revisión y plan semanal", emocional: "Nunca estás solo", dimensional: "12 sesiones de 60 minutos", confirmadoPorCliente: true },
      { nombre: "Sistema de contenido", funcional: "Calendario mensual listo", emocional: "Se acabó el folio en blanco", dimensional: "31 ideas al mes", confirmadoPorCliente: true },
    ],
  },
  fase_2_1: {
    tipo: "CREENCIA_CONTRARIA",
    narrativaDominante: "Para tener clientes hay que publicar rutinas y transformaciones.",
    versionAgresiva: "Las rutinas gratis son la razón por la que sigues pobre.",
    versionConsultiva: "Publicar rutinas atrae gente que quiere rutinas, no entrenador.",
    tesisUnificada: "El contenido que regala tu trabajo atrae a quien no quiere pagarlo.",
  },
  fase_2_2: {
    principal: "Ayudo a entrenadores a vivir de 10 clientes online sin regalar su trabajo.",
    agresivo: "Deja de ser el entrenador gratis de Instagram.",
    comercial: "Mentoría para entrenadores que quieren agenda llena online.",
  },
  fase_2_3: {
    tesis: Array.from({ length: 10 }, (_, i) => `Tesis número ${i + 1} sobre el negocio del entrenamiento online.`),
  },
  fase_2_4: {
    casos: Array.from({ length: 7 }, (_, i) => ({
      tema: `Tema ${i + 1}`,
      casoReal: `Caso real ${i + 1}: entrenador que aplicó el método.`,
      metrica: "clientes nuevos",
      resultado: `${5 + i} clientes`,
      tiempo: "90 días",
      esPlaceholder: i > 4,
    })),
  },
  fase_3: {
    deseos: [
      { nombre: "Independencia", nombreReiss: "Independencia", explicacion: "No depender del gimnasio ni de un jefe." },
      { nombre: "Estatus", nombreReiss: "Estatus", explicacion: "Ser visto como el referente de su nicho." },
      { nombre: "Tranquilidad", nombreReiss: "Tranquilidad", explicacion: "Ingresos previsibles cada mes." },
    ],
  },
  fase_4: {
    hooks: Array.from({ length: 30 }, (_, i) => ({
      deseo: ["Independencia", "Estatus", "Tranquilidad"][i % 3],
      perfil: ["El saturado", "La recién certificada", "El influencer", "La que volvió", "El escéptico"][i % 5],
      nivel: (i % 5) + 1,
      angulo: i % 2 === 0 ? "DOLOR" : "GANANCIA",
      uso: USOS[i % 3],
      hook: `Hook de la matriz número ${i + 1}`,
    })),
  },
  fase_5: {
    magnets: Array.from({ length: 5 }, (_, i) => ({
      codigo: `OM${i + 1}`,
      titulo: `Magnet ${i + 1}: guía práctica`,
      formato: "PDF descargable",
      porQueLoQuiere: "Resuelve un problema inmediato del perfil.",
      ctaExacto: `Comenta «GUIA${i + 1}» y te la envío`,
      diasAplica: [i * 6 + 1, i * 6 + 2],
    })),
  },
  fase_6: calendario(),
};

async function clean() {
  for (const email of [EMAIL_A, EMAIL_B]) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) continue;
    if (user.clientId) {
      const projects = await prisma.project.findMany({ where: { clientId: user.clientId } });
      for (const p of projects) {
        await prisma.message.deleteMany({ where: { projectId: p.id } });
        await prisma.section.deleteMany({ where: { projectId: p.id } });
      }
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.project.deleteMany({ where: { clientId: user.clientId } });
      await prisma.client.delete({ where: { id: user.clientId } });
    } else {
      await prisma.user.delete({ where: { id: user.id } });
    }
  }
  console.log("e2e limpio");
}

async function main() {
  if (process.argv.includes("--clean")) return clean();
  await clean();

  const hash = await bcrypt.hash(PASS, 12);

  const clientA = await prisma.client.create({
    data: { name: "Cliente Demo", business: "Mentoría fitness online" },
  });
  await prisma.user.create({
    data: { email: EMAIL_A, name: "Cliente Demo", passwordHash: hash, role: "CLIENT", clientId: clientA.id },
  });
  const projectA = await prisma.project.create({
    data: {
      clientId: clientA.id,
      title: "Mes 1 — Arquitectura",
      mode: "MODO_1",
      currentPhase: "fase_6",
      status: "REVIEW",
      sections: {
        create: Object.entries(SECTIONS).map(([phaseId, data]) => ({
          phaseId,
          data: JSON.stringify(data),
          status: "APPROVED",
          approvedAt: new Date(),
        })),
      },
    },
  });

  const clientB = await prisma.client.create({
    data: { name: "Otro Cliente", business: "Otro negocio" },
  });
  await prisma.user.create({
    data: { email: EMAIL_B, name: "Otro Cliente", passwordHash: hash, role: "CLIENT", clientId: clientB.id },
  });
  const projectB = await prisma.project.create({
    data: {
      clientId: clientB.id,
      title: "Mes 1 — Arquitectura",
      mode: "MODO_1",
      currentPhase: "fase_0",
      // Igual que la app real: todo proyecto nace con su bienvenida.
      messages: {
        create: {
          phaseId: "fase_0",
          role: "assistant",
          content: `Hola, Otro Cliente. Bienvenido al sistema de Marca Personal + Contenido + Ventas de LIONSCORE.\n\nVamos a construir tu sistema completo paso a paso: yo te hago las preguntas, tú respondes con lo que sabes de tu negocio, y en cada fase te muestro una propuesta que puedes aprobar o corregir. Nada avanza sin tu aprobación, y todo queda guardado.\n\nCuando estés listo, dime "empecemos" o cuéntame directamente: ¿qué vendes hoy?`,
        },
      },
    },
  });

  console.log(JSON.stringify({ emailA: EMAIL_A, emailB: EMAIL_B, pass: PASS, projectA: projectA.id, projectB: projectB.id }));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
