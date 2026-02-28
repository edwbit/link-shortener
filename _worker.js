export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const domain = "short.aifoundry.dpdns.org";

    // Route 1: The Dashboard (Admin)
    if (path === "/admin") {
      const { keys } = await env.SHORT_LINKS.list();
      return new Response(renderAdminHTML(domain, keys), {
        headers: { "Content-Type": "text/html" }
      });
    }

    // Route 2: API - Save
    if (path === "/api/save" && request.method === "POST") {
      const data = await request.formData();
      const key = data.get("key").trim();
      const target = data.get("url").trim();
      if (!key || !target) return new Response("Missing fields", { status: 400 });
      
      await env.SHORT_LINKS.put(key, target);
      return Response.redirect(`https://${domain}/admin?success=true`, 303);
    }

    // Route 3: API - Delete
    if (path === "/api/delete" && request.method === "POST") {
      const data = await request.formData();
      const key = data.get("key");
      await env.SHORT_LINKS.delete(key);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // Route 4: Public Redirector
    const slug = path.split("/")[1];
    if (slug && slug !== "admin" && slug !== "favicon.ico") {
      const destination = await env.SHORT_LINKS.get(slug);
      if (destination) return Response.redirect(destination, 302);
    }

    return new Response("AI Foundry Active", { status: 200 });
  }
};

function renderAdminHTML(domain, keys) {
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Foundry | Link Manager</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      body { font-family: 'Inter', sans-serif; }
    </style>
  </head>
  <body class="bg-slate-50 text-slate-900 min-h-screen">
    <div class="flex flex-col md:flex-row min-h-screen">
      <aside class="w-full md:w-64 bg-slate-900 text-white p-6">
        <div class="flex items-center gap-3 mb-10">
          <div class="bg-blue-600 p-2 rounded-lg"><i data-lucide="zap" class="w-6 h-6"></i></div>
          <h1 class="text-xl font-bold tracking-tight">AI Foundry</h1>
        </div>
        <nav class="space-y-2">
          <a href="/admin" class="flex items-center gap-3 bg-slate-800 p-3 rounded-lg text-blue-400">
            <i data-lucide="layout-dashboard" class="w-5 h-5"></i> Dashboard
          </a>
        </nav>
      </aside>

      <main class="flex-1 p-4 md:p-10">
        <header class="flex justify-between items-center mb-8">
          <h2 class="text-2xl font-bold text-slate-800">Link Manager</h2>
          <div class="text-sm text-slate-500 font-medium">Domain: <span class="text-blue-600">${domain}</span></div>
        </header>

        <section class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
            <i data-lucide="plus-circle" class="w-5 h-5 text-blue-500"></i> Create New Link
          </h3>
          <form action="/api/save" method="POST" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" name="key" placeholder="Slug (e.g. twitter)" required 
              class="border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
            <input type="url" name="url" placeholder="Destination URL" required 
              class="border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
            <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2">
              <i data-lucide="link" class="w-4 h-4"></i> Create Link
            </button>
          </form>
        </section>

        <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table class="w-full text-left border-collapse">
            <thead class="bg-slate-50 border-bottom border-slate-200 text-slate-500 uppercase text-xs font-bold">
              <tr>
                <th class="px-6 py-4">Short Link</th>
                <th class="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${keys.length === 0 ? '<tr><td colspan="2" class="px-6 py-10 text-center text-slate-400">No links found yet.</td></tr>' : 
                keys.map(k => `
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <span class="font-semibold text-slate-700">${domain}/<span class="text-blue-600">${k.name}</span></span>
                      <button onclick="copyLink('${domain}/${k.name}')" class="text-slate-400 hover:text-blue-500 p-1">
                        <i data-lucide="copy" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <button onclick="deleteLink('${k.name}')" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                      <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <script>
      lucide.createIcons();
      function copyLink(text) {
        navigator.clipboard.writeText('https://' + text);
        alert('Copied: ' + text);
      }
      async function deleteLink(key) {
        if (!confirm('Delete this link?')) return;
        const formData = new FormData();
        formData.append('key', key);
        await fetch('/api/delete', { method: 'POST', body: formData });
        location.reload();
      }
    </script>
  </body></html>`;
}

//eof