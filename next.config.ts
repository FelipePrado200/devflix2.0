import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Os pôsteres passam pelo otimizador do Next (/_next/image).
    // O navegador só fala com este servidor, nunca com o TMDB.
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" }],
    formats: ["image/avif", "image/webp"],
  },
  // Os shaders ficam em arquivos .glsl próprios e entram no código como texto.
  // `asset/source` é nativo do webpack 5: nenhum loader extra no projeto.
  webpack(config) {
    config.module.rules.push({ test: /\.glsl$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
