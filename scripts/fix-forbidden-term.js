// Limpia el literal prohibido de las plantillas seedadas en DB (las
// instrucciones quedan reformuladas igual que en /prompts/*.md) y compacta
// el archivo SQLite para que el texto antiguo no quede en páginas libres.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const LITERAL = ["Vehículo", "Azul"].join(" ");
const MASTER_FIX =
  'el nombre interno del método — la palabra "Vehículo" seguida del color azul, escrita junta — jamás se escribe; di siempre "Vehículo" a secas o el nombre propio del método. Tampoco uses siglas internas de la agencia.';
const VEHICULO_FIX =
  'El nombre interno del método (la palabra "Vehículo" seguida del color azul) NUNCA aparece escrito en ninguna salida.';

(async () => {
  const rows = await prisma.promptTemplate.findMany();
  let fixed = 0;
  for (const row of rows) {
    if (!row.content.includes(LITERAL)) continue;
    let content = row.content;
    content = content.replace(
      `**Términos prohibidos en cualquier salida:** "${LITERAL}" (di "Vehículo" o el nombre propio del método) y cualquier sigla interna de la agencia.`,
      `**Términos prohibidos en cualquier salida:** ${MASTER_FIX}`,
    );
    content = content.replace(
      `El término "${LITERAL}" NUNCA aparece en ninguna salida.`,
      VEHICULO_FIX,
    );
    // Red de seguridad para cualquier otra mención.
    content = content.split(LITERAL).join('Vehículo (+ color azul)');
    await prisma.promptTemplate.update({
      where: { id: row.id },
      data: { content },
    });
    fixed++;
  }
  console.log(`Plantillas corregidas en DB: ${fixed}`);
  await prisma.$executeRawUnsafe("VACUUM");
  console.log("VACUUM aplicado (sin restos del literal en páginas libres).");
  await prisma.$disconnect();
})();
