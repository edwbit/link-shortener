// HTML templates for the link shortener

export function renderAdminHTML(domain, links, protocol, searchQuery = "") {
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
          <i data-lucide="link" class="w-5 h-5"></i> Links
        </a>
      </nav>
    </aside>

    <main class="flex-1 p-4 md:p-10">
      <header class="flex justify-between items-center mb-8">
        <h2 class="text-2xl font-bold text-slate-800">Links</h2>
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

      <div class="mb-4">
        <form action="/admin" method="GET" class="flex gap-2">
          <input type="text" name="q" placeholder="Search links..." value="${searchQuery}"
            class="border border-slate-300 rounded-lg px-4 py-2 w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none">
          <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Search
          </button>
          ${searchQuery ? '<button type="button" onclick="window.location=\'/admin\'" class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg">Clear</button>' : ''}
        </form>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50 border-bottom border-slate-200 text-slate-500 uppercase text-xs font-bold">
            <tr>
              <th class="px-6 py-4 w-16">#</th>
              <th class="px-6 py-4">Short Link</th>
              <th class="px-6 py-4">Destination URL</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${links.length === 0 ? '<tr><td colspan="4" class="px-6 py-10 text-center text-slate-400">No links found yet.</td></tr>' : 
              links.map((k, i) => `
              <tr class="hover:bg-slate-50 transition-colors">
                <td class="px-6 py-4 text-slate-400">${i + 1}</td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span class="font-semibold text-slate-700">${domain}/<span class="text-blue-600">${k.name}</span></span>
                    <button onclick="copyLink('${domain}/${k.name}')" class="text-slate-400 hover:text-blue-500 p-1">
                      <i data-lucide="copy" class="w-4 h-4"></i>
                    </button>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <a href="${k.url}" target="_blank" class="text-blue-500 hover:underline">${k.url}</a>
                </td>
                <td class="px-6 py-4 text-right">
                  <button onclick="openEditModal('${k.name}', '${k.url}')" class="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors mr-2">
                    <i data-lucide="pencil" class="w-5 h-5"></i>
                  </button>
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
      navigator.clipboard.writeText('${protocol}://' + text);
      alert('Copied: ' + text);
    }
    function filterLinks() {
      const input = document.getElementById('searchInput');
      const filter = input.value.toLowerCase();
      const table = document.querySelector('table');
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
      });
    }
    async function deleteLink(key) {
      if (!confirm('Delete this link?')) return;
      const formData = new FormData();
      formData.append('key', key);
      await fetch('/api/delete', { method: 'POST', body: formData });
      location.reload();
    }
    async function editLink(key, currentUrl) {
      const newSlug = prompt('Edit short URL (slug):', key);
      if (!newSlug || newSlug === key) {
        const newUrl = prompt('Edit destination URL:', currentUrl);
        if (!newUrl || newUrl === currentUrl) return;
        const formData = new FormData();
        formData.append('key', key);
        formData.append('url', newUrl);
        await fetch('/api/update', { method: 'POST', body: formData });
        location.reload();
        return;
      }
      if (!confirm('Changing the slug will create a new link. Continue?')) return;
      const newUrl = prompt('Edit destination URL:', currentUrl);
      if (!newUrl) return;
      const formData = new FormData();
      formData.append('oldKey', key);
      formData.append('newKey', newSlug);
      formData.append('url', newUrl);
      await fetch('/api/update', { method: 'POST', body: formData });
      location.reload();
    }
  </script>

  <!-- Edit Modal -->
  <div id="editModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-xl p-6 w-full max-w-md mx-4">
      <h3 class="text-lg font-semibold mb-4">Edit Link</h3>
      <form id="editForm">
        <input type="hidden" id="editOldKey">
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-1">Short URL (slug)</label>
          <input type="text" id="editNewKey" required 
            class="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-1">Destination URL</label>
          <input type="url" id="editUrl" required 
            class="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none">
        </div>
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="closeEditModal()" class="px-4 py-2 text-slate-600 hover:text-slate-800">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Save</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    function openEditModal(key, url) {
      document.getElementById('editOldKey').value = key;
      document.getElementById('editNewKey').value = key;
      document.getElementById('editUrl').value = url;
      document.getElementById('editModal').classList.remove('hidden');
      document.getElementById('editModal').classList.add('flex');
    }
    function closeEditModal() {
      document.getElementById('editModal').classList.add('hidden');
      document.getElementById('editModal').classList.remove('flex');
    }
    document.getElementById('editForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldKey = document.getElementById('editOldKey').value;
      const newKey = document.getElementById('editNewKey').value;
      const url = document.getElementById('editUrl').value;
      
      const formData = new FormData();
      if (oldKey !== newKey) {
        formData.append('oldKey', oldKey);
        formData.append('newKey', newKey);
      } else {
        formData.append('key', oldKey);
      }
      formData.append('url', url);
      
      await fetch('/api/update', { method: 'POST', body: formData });
      closeEditModal();
      location.reload();
    });
  </script>
</body></html>`;
}
