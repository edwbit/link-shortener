// Unified worker for both local dev and production
// - Uses Cloudflare KV if available (production)
// - Falls back to in-memory storage if KV not bound (local dev)
// - Domain detection via env.DOMAIN or defaults to request host

import { createStorage } from './src/storage.js';
import { renderAdminHTML } from './src/html.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Domain: use env.DOMAIN if set, otherwise fall back to request host
    const domain = env.DOMAIN || "short.aifoundry.dpdns.org";
    const useProductionDomain = env.DOMAIN != null;
    const currentDomain = useProductionDomain ? domain : url.host;
    const protocol = useProductionDomain ? "https" : "http";

    // Create storage instance
    const storage = createStorage(env);

    // Route 1: The Dashboard (Admin)
    if (path === "/admin") {
      const links = await storage.listKeys();
      return new Response(renderAdminHTML(currentDomain, links, protocol), {
        headers: { 
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
    }

    // Route 2: API - Save
    if (path === "/api/save" && request.method === "POST") {
      const data = await request.formData();
      const key = data.get("key").trim();
      const target = data.get("url").trim();
      if (!key || !target) return new Response("Missing fields", { status: 400 });
      
      await storage.saveLink(key, target);
      return Response.redirect(`${protocol}://${currentDomain}/admin?success=true`, 303);
    }

    // Route 3: API - Update
    if (path === "/api/update" && request.method === "POST") {
      const data = await request.formData();
      const key = data.get("key");
      const newUrl = data.get("url").trim();
      if (!key || !newUrl) return new Response("Missing fields", { status: 400 });
      
      await storage.saveLink(key, newUrl);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Route 4: API - Delete
    if (path === "/api/delete" && request.method === "POST") {
      const data = await request.formData();
      const key = data.get("key");
      await storage.deleteLink(key);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Route 5: Public Redirector
    const slug = decodeURIComponent(path.split("/")[1]);
    if (slug && slug !== "admin" && slug !== "favicon.ico") {
      const destination = await storage.getLink(slug);
      if (destination) return Response.redirect(destination, 302);
    }

    return new Response("AI Foundry Active", { status: 200 });
  }
};

//eof
