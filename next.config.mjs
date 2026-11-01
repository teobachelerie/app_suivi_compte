/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Le mode démo (npm run demo) compile dans son propre dossier, pour ne pas écraser le build de
  // production utilisé par les captures (.next).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Toujours défini (« 0 » hors démo) : le build remplace alors la condition par une constante
  // et retire tout le code du mode démo de la production.
  env: { NEXT_PUBLIC_DEMO: process.env.NEXT_PUBLIC_DEMO === "1" ? "1" : "0" },
};
export default nextConfig;
