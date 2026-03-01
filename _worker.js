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
      const searchQuery = url.searchParams.get("q") || "";
      const cursor = url.searchParams.get("cursor");
      
      // Use search if query exists, otherwise use paginated list
      let result;
      if (searchQuery) {
        result = await storage.search(searchQuery, 10, cursor);
      } else {
        result = await storage.listKeys(10, cursor);
      }
      
      return new Response(renderAdminHTML(currentDomain, result.links, protocol, searchQuery, cursor, result.total, result.cursor), {
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
      
      // Validate URL format
      try {
        new URL(target);
      } catch {
        return new Response(`
          <script>
            alert('Error: Invalid URL format. Please enter a valid URL including http:// or https://');
            window.location.href = 'https://${currentDomain}/admin';
          </script>
        `, { 
          headers: { "Content-Type": "text/html" }
        });
      }
      
      // Optional: Check if URL exists (HEAD request)
      try {
        const urlCheck = await fetch(target, { 
          method: 'HEAD', 
          signal: AbortSignal.timeout(5000),
          redirect: 'follow'
        });
        if (!urlCheck.ok && urlCheck.status !== 405) { // 405 = method not allowed, but URL exists
          return new Response(`
            <script>
              if (confirm('Warning: This URL appears to be broken or unreachable. Save anyway?')) {
                window.location.href = 'https://${currentDomain}/admin?save=' + encodeURIComponent('${key}') + '&url=' + encodeURIComponent('${target}');
              } else {
                window.location.href = 'https://${currentDomain}/admin';
              }
            </script>
          `, { 
            headers: { "Content-Type": "text/html" }
          });
        }
      } catch (error) {
        // URL check failed (common with Google Drive, etc.), but allow save with warning
        console.log('URL validation failed:', error.message);
        return new Response(`
          <script>
            if (confirm('Could not verify this URL (this is common with Google Drive, etc.). Save anyway?')) {
              window.location.href = 'https://${currentDomain}/admin?save=' + encodeURIComponent('${key}') + '&url=' + encodeURIComponent('${target}');
            } else {
              window.location.href = 'https://${currentDomain}/admin';
            }
          </script>
        `, { 
          headers: { "Content-Type": "text/html" }
        });
      }
      
      // Server-side duplicate validation (comprehensive check)
      const existingLink = await storage.getLink(key);
      if (existingLink) {
        return new Response(`
          <script>
            alert('Error: Short URL "${key}" already exists! Please choose a different name.');
            window.location.href = 'https://${currentDomain}/admin';
          </script>
        `, { 
          headers: { "Content-Type": "text/html" }
        });
      }
      
      await storage.saveLink(key, { url: target, clicks: 0 });
      return Response.redirect(`https://${currentDomain}/admin?success=true`, 303);
    }

    // Route 3: API - Update
    if (path === "/api/update" && request.method === "POST") {
      const data = await request.formData();
      const oldKey = data.get("oldKey");
      const newKey = data.get("newKey");
      const url = data.get("url").trim();
      
      if (!url) return new Response("Missing fields", { status: 400 });
      
      // If renaming (oldKey != newKey), check if new key already exists
      if (oldKey && newKey && oldKey !== newKey) {
        const existingLink = await storage.getLink(newKey);
        if (existingLink) {
          return new Response(`
            <script>
              alert('Error: Short URL "${newKey}" already exists! Please choose a different name.');
              window.location.href = 'https://${currentDomain}/admin';
            </script>
          `, { 
            headers: { "Content-Type": "text/html" }
          });
        }
        
        await storage.deleteLink(oldKey);
        await storage.saveLink(newKey, { url: url, clicks: 0 });
      } else {
        // Just update URL, preserve existing clicks
        const key = data.get("key");
        if (!key) return new Response("Missing key", { status: 400 });
        const existing = await storage.getLink(key);
        const currentClicks = existing ? existing.clicks || 0 : 0;
        await storage.saveLink(key, { url: url, clicks: currentClicks });
      }
      
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
      if (destination) {
        // Handle both object and string formats
        let url;
        if (typeof destination === 'object' && destination.url) {
          url = destination.url;
        } else {
          url = destination;
        }
        
        // Detect if it's a bot or crawler
        const userAgent = request.headers.get('user-agent') || '';
        const referer = request.headers.get('referer') || '';
        
        // Common bot/crawler patterns
        const botPatterns = [
          /googlebot/i,
          /bingbot/i,
          /slurp/i,
          /duckduckbot/i,
          /baiduspider/i,
          /yandexbot/i,
          /facebookexternalhit/i,
          /twitterbot/i,
          /linkedinbot/i,
          /telegrambot/i,
          /whatsapp/i,
          /crawler/i,
          /spider/i,
          /bot/i,
          /curl/i,
          /wget/i,
          /python/i,
          /java/i,
          /node/i,
          /go-http/i,
          /ruby/i,
          /php/i
        ];
        
        const isBot = botPatterns.some(pattern => pattern.test(userAgent));
        
        // Log all requests for debugging
        console.log('REQUEST LOG:', {
          slug: slug,
          userAgent: userAgent.substring(0, 100),
          referer: referer.substring(0, 100),
          isBot: isBot,
          timestamp: new Date().toISOString()
        });
        
        // Only increment clicks for non-bot traffic
        if (!isBot) {
          await storage.incrementClicks(slug);
          console.log('ORGANIC CLICK:', slug);
        } else {
          console.log('BOT CLICK IGNORED:', slug);
        }
        
        return Response.redirect(url, 302);
      }
    }

    // Route 6: API - Get Clicks
    if (path.startsWith("/api/get-clicks/") && request.method === "GET") {
      const slug = decodeURIComponent(path.split("/")[3]);
      if (!slug) return new Response("Missing slug", { status: 400 });
      
      const link = await storage.getLink(slug);
      if (!link) return new Response("Link not found", { status: 404 });
      
      return new Response(JSON.stringify({ 
        slug: slug,
        clicks: link.clicks || 0 
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Handle forced save from URL validation
    if (path === "/admin" && url.searchParams.has("save")) {
      const key = url.searchParams.get("save");
      const url = url.searchParams.get("url");
      
      if (key && url) {
        await storage.saveLink(key, { url: url, clicks: 0 });
        return Response.redirect(`https://${currentDomain}/admin?success=true`, 303);
      }
    }

    return new Response("AI Foundry Active", { status: 200 });
  }
};

//eof
