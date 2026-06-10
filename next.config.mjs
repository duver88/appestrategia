/** @type {import('next').NextConfig} */
const nextConfig = {
  // Puppeteer (M2) se ejecuta solo en servidor; evitar que Next intente empaquetarlo.
  serverExternalPackages: ["puppeteer", "@prisma/client"],
};

export default nextConfig;
