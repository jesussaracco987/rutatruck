import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.qrserver.com",
      },
    ],
  },
  async redirects() {
    return [
      // La landing de quien envía se llamaba "para empresas". Los links viejos
      // (bio de Instagram, campañas) siguen andando y conservan sus UTM.
      { source: "/para-empresas", destination: "/enviar", permanent: true },
    ];
  },
};

export default nextConfig;
