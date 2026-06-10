import puppeteer, { type Browser } from "puppeteer";

// Browser singleton: lanzar Chromium es caro; se reutiliza entre requests.
const globalForPdf = globalThis as unknown as {
  pdfBrowser?: Promise<Browser>;
};

async function getBrowser(): Promise<Browser> {
  if (!globalForPdf.pdfBrowser) {
    globalForPdf.pdfBrowser = puppeteer.launch({
      headless: true,
      // Requerido en Docker/VPS (M6); inofensivo en desarrollo local.
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  const browser = await globalForPdf.pdfBrowser;
  if (!browser.connected) {
    globalForPdf.pdfBrowser = undefined;
    return getBrowser();
  }
  return browser;
}

/**
 * Renderiza el HTML de la plantilla a PDF A4 con header/footer editoriales
 * en todas las páginas.
 */
export async function renderPdf(
  html: string,
  clientName: string,
): Promise<Uint8Array> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width:100%;font-size:7px;color:#9a9186;font-family:Arial,sans-serif;padding:0 56px;letter-spacing:1px;text-transform:uppercase;">
          LIONSCORE AI — Sistema de Contenido ${clientName}
        </div>`,
      footerTemplate: `
        <div style="width:100%;font-size:7px;color:#9a9186;font-family:Arial,sans-serif;padding:0 56px;display:flex;justify-content:space-between;">
          <span>${clientName} · Confidencial</span>
          <span>Página <span class="pageNumber"></span></span>
        </div>`,
      margin: { top: "52px", bottom: "48px", left: "0", right: "0" },
    });
  } finally {
    await page.close();
  }
}
