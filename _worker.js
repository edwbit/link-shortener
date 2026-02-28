export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const domain = "short.aifoundry.dpdns.org";

    // Route 1: The Dashboard
    if (path === "/admin") {
      const { keys } = await env.SHORT_LINKS.list();
      return new Response(renderAdminHTML(domain, keys), {
        headers: { "Content-Type": "text/html" }
      });
    }

    // Route 2: The Logic to Save
    if (path === "/api/save" && request.method === "POST") {
      const data = await request.formData();
      const key = data.get("key").trim();
      const target = data.get("url").trim();
      
      await env.SHORT_LINKS.put(key, target);
      return Response.redirect(`https://${domain}/admin?success=true`, 303);
    }

    // Route 3: Public Redirects
    const slug = path.split("/")[1];
    if (slug && slug !== "admin" && slug !== "favicon.ico") {
      const destination = await env.SHORT_LINKS.get(slug);
      if (destination) return Response.redirect(destination, 302);
    }

    return new Response("AI Foundry Active", { status: 200 });
  }
};

function renderAdminHTML(domain, keys) {
  return `<!DOCTYPE html><html><head><title>Admin</title>
  <style>
    body { font-family: sans-serif; background: #f4f7f6; display: flex; height: 100vh; margin: 0; }
    .sidebar { width: 220px; background: #1a202c; color: white; padding: 20px; }
    .content { flex: 1; padding: 40px; }
    .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    input { padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
    button { padding: 8px 16px; background: #3182ce; color: white; border: none; border-radius: 4px; cursor: pointer; }
    table { width: 100%; margin-top: 20px; border-collapse: collapse; }
    td, th { padding: 12px; border-bottom: 1px solid #eee; text-align: left; }
  </style>
  </head>
  <body>
    <div class="sidebar"><h2>AI Foundry</h2></div>
    <div class="content">
      <div class="card">
        <h3>Create Link</h3>
        <form action="/api/save" method="POST">
          <input type="text" name="key" placeholder="Slug" required>
          <input type="url" name="url" placeholder="URL" required>
          <button type="submit">Add</button>
        </form>
      </div>
      <table>
        <thead><tr><th>Short Link</th></tr></thead>
        <tbody>
          ${keys.map(k => `<tr><td>${domain}/${k.name}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  </body></html>`;
}