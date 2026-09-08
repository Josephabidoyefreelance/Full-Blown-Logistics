import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://full-blown-logistics.vercel.app"; // TODO: swap to your real domain once connected

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/dashboard", "/api"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
