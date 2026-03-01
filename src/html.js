// HTML templates for the link shortener

export function renderAdminHTML(domain, links, protocol, searchQuery = "", cursor = null, total = null, nextCursor = null) {
  // Helper to escape HTML and truncate long URLs
  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
  
  const truncateUrl = (url, maxLen = 60) => {
    if (!url || url.length <= maxLen) return escapeHtml(url);
    return escapeHtml(url.substring(0, maxLen)) + '...';
  };
   // Pagination logic
   const limit = 10;
   // For KV, cursors are opaque strings, so we can't calculate exact page numbers
   // For local dev, cursors are numeric offsets
   let currentPage;
   if (!cursor) {
     currentPage = 1;
   } else if (/^\d+$/.test(cursor)) {
     // Numeric cursor (local dev)
     currentPage = Math.floor(parseInt(cursor) / limit) + 1;
   } else {
     // KV cursor (opaque string) - we can't determine exact page, so assume page 2+
     currentPage = 2;
   }
   
   // Define hasNext for pagination logic
   const hasNext = nextCursor !== null;
   
   // Calculate totalPages based on whether there are more results available
   // If we have a nextCursor, there are more pages; otherwise, this is the last page
   // If we have a total count, use that to calculate totalPages
   let totalPages;
   if (total !== null) {
     totalPages = Math.ceil(total / limit);
   } else {
     // Estimate based on whether we have a next cursor
     // If there's a next cursor, we know there are more pages
     // Otherwise, assume current page might not be the last if we got a full page of results
     totalPages = hasNext ? currentPage + 1 : currentPage;
   }
   
     const pageInfo = total !== null ? `<span class="page-info text-sm">Page ${currentPage} of ${totalPages} (${total} links)</span>` : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Foundry | Link Manager</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        fontSize: {
          xs: '0.8125rem',
          sm: '0.875rem',
          base: '0.9375rem',
          lg: '1rem',
        }
      }
    }
  </script>
  <script src="https://unpkg.com/lucide@latest"></script>
  <link href="https://api.fontshare.com/v2/css?f[]=geist@400,500,600,700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Geist', sans-serif; }
    
    /* Dark theme (default) */
    .theme-dark { --bg-primary: #151A21; --bg-secondary: #0B0D10; --bg-hover: #1C232B; --border: #273140; --text-primary: #FFFFFF; --text-secondary: #8892B0; --accent: #40E0FF; --shadow: 0 4px 20px rgba(0,0,0,0.3); }
    
    /* Light theme - swapped sidebar/main colors */
    .theme-light { --bg-primary: #F8FAFC; --bg-secondary: #FFFFFF; --bg-hover: #F1F5F9; --border: #E2E8F0; --text-primary: #1E293B; --text-secondary: #64748B; --accent: #0891B2; --btn-text: #FFFFFF; --card-bg: #F8FAFC; --shadow: 0 4px 20px rgba(0,0,0,0.08); }
    
    /* Button text - white in light theme */
    .theme-light button[type="submit"],
    .theme-light .bg-accent { color: var(--btn-text); }
    
    /* Apply shadows to sidebar and sections */
    .sidebar-shadow { box-shadow: var(--shadow); }
    .section-shadow { box-shadow: var(--shadow); }
    .input-shadow { box-shadow: var(--shadow); }
    
    /* Responsive sidebar */
    .sidebar-mobile {
      position: fixed;
      top: 0;
      left: -100%;
      width: 80%;
      max-width: 280px;
      height: 100vh;
      z-index: 50;
      transition: left 0.3s ease-in-out;
    }
    
    .sidebar-mobile.open {
      left: 0;
    }
    
    .sidebar-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      z-index: 40;
      display: none;
    }
    
    .sidebar-overlay.show {
      display: block;
    }
    
    /* Mobile menu button */
    .mobile-menu-btn {
      display: none;
    }
    
    /* Responsive table */
    .table-container {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    
    .table-container table {
      min-width: 600px;
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
      .mobile-menu-btn {
        display: flex !important;
      }
      
      .sidebar-desktop {
        display: none !important;
      }
      
      .sidebar-mobile {
        display: flex !important;
      }
      
      main {
        margin-left: 0 !important;
        padding-left: 1rem !important;
        padding-right: 1rem !important;
      }
      
      .pagination-form {
        flex-direction: column;
        align-items: stretch !important;
        gap: 0.5rem;
      }
      
      .pagination-form form {
        width: 100%;
      }
      
      .pagination-form span {
        text-align: center;
      }
    }
    
    @media (min-width: 769px) {
      .mobile-menu-btn {
        display: none !important;
      }
      
      .sidebar-mobile {
        display: none !important;
      }
      
      .sidebar-desktop {
        display: flex !important;
      }
    }
    
    /* Toast notification styles */
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--accent);
      color: #0B0D10;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: var(--shadow);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 1000;
      font-size: 14px;
      font-weight: 500;
    }
    
    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }
    .nav-links-btn {
      position: relative;
      overflow: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .nav-links-btn::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s ease;
    }
    
    .nav-links-btn:hover::before {
      left: 100%;
    }
    
    .nav-links-btn:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 20px rgba(64,224,255,0.3), inset 0 0 20px rgba(64,224,255,0.1);
    }
    
    .nav-links-btn:active {
      transform: translateX(2px) scale(0.98);
    }
    
    /* Nav Links button - dark text in dark theme */
    .theme-dark .nav-links-btn { color: #0B0D10; }
    .theme-dark .nav-links-btn i { color: #0B0D10; }
    
    body { background-color: var(--bg-primary); color: var(--text-primary); }
    
    /* Override Tailwind default border color for dark theme */
    .theme-dark { --border-color: #273140; }
    .theme-dark *, .theme-dark *::before, .theme-dark *::after { border-color: #273140; }
    .bg-primary { background-color: var(--bg-primary); }
    .bg-secondary { background-color: var(--bg-secondary); }
    .bg-hover:hover { background-color: var(--bg-hover); }
    .border-main { border-color: var(--border); }
    .text-primary { color: var(--text-primary); }
    .text-secondary { color: var(--text-secondary); }
    .text-accent { color: var(--accent); }
    .bg-accent { background-color: var(--accent); }
    .hover-bg-accent:hover { background-color: var(--accent); }
    
    /* Form inputs */
    .input-bg { background-color: var(--bg-secondary); border-color: var(--border); color: var(--text-primary); }
    .input-bg::placeholder { color: var(--text-secondary); }
    .input-bg:focus { --tw-ring-color: var(--accent); }
  </style>
</head>
<body class="min-h-screen">
  <!-- Mobile sidebar overlay -->
  <div id="sidebarOverlay" class="sidebar-overlay" onclick="toggleSidebar()"></div>
  
  <!-- Mobile sidebar -->
  <aside id="sidebarMobile" class="sidebar-mobile sidebar-shadow bg-secondary text-white p-4 flex flex-col">
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-2">
        <div class="bg-accent p-1.5 rounded-md"><i data-lucide="zap" class="w-4 h-4 text-[#0B0D10]"></i></div>
        <h1 class="text-sm font-semibold tracking-tight text-primary">AI Foundry</h1>
      </div>
      <button onclick="toggleSidebar()" class="text-secondary hover:text-primary p-1">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>
    </div>
    <nav class="space-y-1">
      <a href="/admin" class="nav-links-btn flex items-center gap-2 border-l-2 border-accent bg-accent text-white px-3 py-2 text-sm rounded-md">
        <i data-lucide="link" class="w-4 h-4"></i> Links
      </a>
    </nav>
    
    <div class="mt-auto pt-4 border-t border-main">
      <button onclick="toggleTheme()" class="flex items-center gap-2 text-secondary hover:text-primary text-sm w-full">
        <i data-lucide="sun" class="w-4 h-4 theme-icon-dark"></i>
        <i data-lucide="moon" class="w-4 h-4 theme-icon-light hidden"></i>
        <span class="theme-label">Toggle Theme</span>
      </button>
    </div>
  </aside>

  <div class="flex min-h-screen">
    <!-- Desktop sidebar -->
    <aside class="sidebar-desktop w-56 h-screen sticky top-0 bg-secondary text-white p-4 flex flex-col sidebar-shadow">
      <div class="flex items-center gap-2 mb-6">
        <div class="bg-accent p-1.5 rounded-md"><i data-lucide="zap" class="w-4 h-4 text-[#0B0D10]"></i></div>
        <h1 class="text-sm font-semibold tracking-tight text-primary">AI Foundry</h1>
      </div>
      <nav class="space-y-1">
        <a href="/admin" class="nav-links-btn flex items-center gap-2 border-l-2 border-accent bg-accent text-white px-3 py-2 text-sm rounded-md">
          <i data-lucide="link" class="w-4 h-4"></i> Links
        </a>
      </nav>
      
      <div class="mt-auto pt-4 border-t border-main">
        <button onclick="toggleTheme()" class="flex items-center gap-2 text-secondary hover:text-primary text-sm w-full">
          <i data-lucide="sun" class="w-4 h-4 theme-icon-dark"></i>
          <i data-lucide="moon" class="w-4 h-4 theme-icon-light hidden"></i>
          <span class="theme-label">Toggle Theme</span>
        </button>
      </div>
    </aside>

    <main class="flex-1 pt-0 pb-10 px-4 md:px-10 max-w-7xl mx-auto w-full flex flex-col">
    <header class="flex justify-between items-center mb-6 sticky top-0 bg-[var(--bg-primary)] py-4 px-4 z-10 section-shadow">
      <!-- Mobile menu button -->
      <button onclick="toggleSidebar()" class="mobile-menu-btn bg-accent hover:opacity-90 text-[#0B0D10] p-2 rounded-md">
        <i data-lucide="menu" class="w-5 h-5"></i>
      </button>
      
      <h2 class="text-lg font-semibold text-primary">Links</h2>
      <form action="/admin" method="GET" class="flex gap-2">
        <input type="text" name="q" placeholder="Search links..." value="${searchQuery}"
          class="input-bg border border-main rounded-md px-3 py-1.5 text-sm w-full md:w-56 focus:ring-1 focus:ring-accent outline-none input-shadow">
        <button type="submit" class="bg-accent hover:opacity-90 text-[#0B0D10] px-3 py-1.5 rounded-md text-sm font-medium input-shadow">
          Search
        </button>
        ${searchQuery ? '<button type="button" onclick="window.location=\'/admin\'" class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm input-shadow">Clear</button>' : ''}
      </form>
    </header>

      <section class="bg-secondary rounded-lg border border-main p-4 mb-6 section-shadow">
        <h3 class="text-sm font-medium mb-3 flex items-center gap-2 text-secondary">
          <i data-lucide="plus-circle" class="w-4 h-4 text-accent"></i> Create New Link
        </h3>
        <form action="/api/save" method="POST" class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end" onsubmit="return validateCreateForm(event)">
          <input type="text" name="key" placeholder="Slug (e.g. twitter)" required 
            class="input-bg border border-main rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-accent outline-none md:col-span-3">
          <input type="url" name="url" placeholder="Destination URL" required 
            class="input-bg border border-main rounded-md px-3 py-1.5 text-sm focus:ring-1 focus:ring-accent outline-none md:col-span-7">
          <button type="submit" class="bg-accent hover:opacity-90 text-[#0B0D10] font-medium py-1.5 px-3 rounded-md transition-all flex items-center justify-center gap-2 text-sm md:col-span-2">
            <i data-lucide="link" class="w-3.5 h-3.5"></i> Create
          </button>
        </form>
      </section>

      <div class="mb-4">

      <div class="bg-secondary rounded-xl border border-main overflow-hidden section-shadow">
        <div class="table-container">
          <table class="w-full text-left border-collapse">
            <thead class="bg-secondary text-secondary uppercase text-xs font-medium tracking-wider">
              <tr>
                <th class="px-3 py-2 w-12">#</th>
                <th class="px-3 py-2">Short Link</th>
                <th class="px-3 py-2">Destination URL</th>
                <th class="px-3 py-2 text-center"><i data-lucide="mouse-pointer-click" class="w-4 h-4 inline"></i> Clicks</th>
                <th class="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-main">
              ${links.length === 0 ? '<tr><td colspan="5" class="px-6 py-10 text-center text-secondary">No links found yet.</td></tr>' : 
                links.map((k, i) => `
                <tr class="bg-hover transition-colors">
                  <td class="px-3 py-1.5 text-secondary">${i + 1}</td>
                  <td class="px-3 py-1.5">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-primary">${domain}/<span class="text-accent">${k.name}</span></span>
                      <button onclick="copyLink('${domain}/${k.name}')" class="text-secondary hover:text-accent p-0.5">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </td>
                  <td class="px-3 py-1.5">
                    <a href="${escapeHtml(k.url)}" target="_blank" title="${escapeHtml(k.url)}" class="text-accent hover:underline">${truncateUrl(k.url, 40)}</a>
                  </td>
                  <td class="px-3 py-1.5 text-center">
                    <span class="inline-flex items-center gap-1 text-secondary" data-click-slug="${k.name}">
                      <i data-lucide="mouse-pointer-click" class="w-3.5 h-3.5"></i>
                      <span class="click-count">${k.clicks || 0}</span>
                    </span>
                  </td>
                  <td class="px-3 py-1.5 text-right">
                    <button onclick="openEditModal('${escapeHtml(k.name)}', '${escapeHtml(k.url)}')" class="text-secondary hover:text-accent hover:bg-secondary p-1 rounded transition-colors mr-1">
                      <i data-lucide="pencil" class="w-4 h-4"></i>
                    </button>
                    <button onclick="deleteLink('${k.name}')" class="text-secondary hover:text-red-400 hover:bg-secondary p-1 rounded transition-colors">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
        ${links.length > 0 ? `
         <div class="px-6 py-4 border-t border-main pagination-form flex justify-between items-center flex-wrap gap-2">
            <!-- Jump to page form -->
            <form id="jumpToPageForm" class="flex items-center gap-1">
              <input type="number" id="jumpToPageInput" min="1" max="${totalPages}" placeholder="Page" class="w-16 px-2 py-1.5 input-bg border border-main rounded-md text-sm focus:ring-1 focus:ring-accent outline-none">
              <button type="submit" class="px-2 py-1.5 bg-accent hover:opacity-90 text-[#0B0D10] rounded-md text-sm font-medium">Go</button>
            </form>
            <span class="text-sm">${pageInfo}</span>
         </div>
         
         <script>
         // Add jump to page functionality
         document.getElementById('jumpToPageForm').addEventListener('submit', function(e) {
           e.preventDefault();
           const pageInput = document.getElementById('jumpToPageInput');
           const targetPage = parseInt(pageInput.value);
           
           if (targetPage >= 1 && targetPage <= ${totalPages}) {
             const cursor = targetPage === 1 ? '' : '?cursor=' + String((targetPage - 1) * ${limit});
             const searchQuery = '${searchQuery}';
             const searchParam = searchQuery ? (cursor ? '&' : '?') + 'q=' + encodeURIComponent(searchQuery) : '';
             window.location.href = '/admin' + cursor + searchParam;
           } else {
             alert('Please enter a valid page number between 1 and ${totalPages}');
           }
         });
         </script>` : ''}
      </div>
      
      <!-- Footer -->
      <footer class="border-t border-main py-6 px-4 text-center text-sm text-secondary mt-auto">
        <div class="flex flex-col md:flex-row items-center justify-center gap-2">
          <span class="font-medium text-primary">AI Foundry</span>
          <span class="hidden md:inline">|</span>
          <span>Powered by Cloudflare</span>
          <span class="hidden md:inline">|</span>
          <span>Coding Assistants</span>
        </div>
      </footer>
    </main>
  </div>

   <script>
     lucide.createIcons();
     
     // Sidebar toggle for mobile
     function toggleSidebar() {
       const sidebar = document.getElementById('sidebarMobile');
       const overlay = document.getElementById('sidebarOverlay');
       
       sidebar.classList.toggle('open');
       overlay.classList.toggle('show');
     }
     
     // Theme toggle
     function toggleTheme() {
       const body = document.body;
       const isDark = body.classList.contains('theme-dark');
       const isLight = body.classList.contains('theme-light');
       
       if (isDark) {
         body.classList.remove('theme-dark');
         body.classList.add('theme-light');
         localStorage.setItem('theme', 'light');
       } else {
         body.classList.remove('theme-light');
         body.classList.add('theme-dark');
         localStorage.setItem('theme', 'dark');
       }
       lucide.createIcons();
     }
     
     // Load saved theme
     (function() {
       const savedTheme = localStorage.getItem('theme') || 'dark';
       document.body.classList.add('theme-' + savedTheme);
     })();
     
     function copyLink(text) {
      navigator.clipboard.writeText('${protocol}://' + text);
      showToast('Copied: ' + text);
    }
    
    function showToast(message) {
      // Remove existing toast
      const existingToast = document.querySelector('.toast');
      if (existingToast) {
        existingToast.remove();
      }
      
      // Create new toast
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      document.body.appendChild(toast);
      
      // Show toast
      setTimeout(() => toast.classList.add('show'), 10);
      
      // Hide toast after 2 seconds
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }
     async function deleteLink(key) {
      if (!confirm('Delete this link?')) return;
      
      // Immediately hide the row for better UX
      const row = document.querySelector('[data-click-slug="' + key + '"]')?.closest('tr');
      if (row) {
        row.style.opacity = '0.5';
        row.style.pointerEvents = 'none';
      }
      
      try {
        const formData = new FormData();
        formData.append('key', key);
        
        const response = await fetch('/api/delete', { 
          method: 'POST', 
          body: formData 
        });
        
        if (response.ok) {
          // KV has delays, so show feedback and reload
          console.log('Link deleted, reloading page...');
          showToast('Link deleted successfully!');
          
          // Reload after a short delay to let KV start syncing
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          // Restore row if delete failed
          if (row) {
            row.style.opacity = '1';
            row.style.pointerEvents = 'auto';
          }
          alert('Error deleting link');
        }
      } catch (error) {
        // Restore row if error
        if (row) {
          row.style.opacity = '1';
          row.style.pointerEvents = 'auto';
        }
        alert('Error: ' + error.message);
      }
    }
     
     // Add jump to page functionality
     document.addEventListener('DOMContentLoaded', function() {
       const jumpToPageForm = document.getElementById('jumpToPageForm');
       if (jumpToPageForm) {
         jumpToPageForm.addEventListener('submit', function(e) {
           e.preventDefault();
           const pageInput = document.getElementById('jumpToPageInput');
           const targetPage = parseInt(pageInput.value);
           const totalPages = ${totalPages};
           
           if (targetPage >= 1 && targetPage <= totalPages) {
             const limit = ${limit};
             const cursor = targetPage === 1 ? '' : '?cursor=' + String((targetPage - 1) * limit);
             const searchQuery = '${searchQuery}';
             const searchParam = searchQuery ? (cursor ? '&' : '?') + 'q=' + encodeURIComponent(searchQuery) : '';
             window.location.href = '/admin' + cursor + searchParam;
           } else {
             alert('Please enter a valid page number between 1 and ' + totalPages);
           }
         });
       }
     });
   </script>

  <!-- Edit Modal -->
  <div id="editModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-primary rounded-xl border border-main p-6 w-full max-w-md mx-4">
      <h3 class="text-lg font-semibold mb-4 text-primary">Edit Link</h3>
      <form id="editForm">
        <input type="hidden" id="editOldKey">
        <div class="mb-4">
          <label class="block text-sm font-medium text-secondary mb-1">Short URL (slug)</label>
          <input type="text" id="editNewKey" required 
            class="w-full input-bg border border-main rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none">
        </div>
        <div class="mb-4">
          <label class="block text-sm font-medium text-secondary mb-1">Destination URL</label>
          <input type="url" id="editUrl" required 
            class="w-full input-bg border border-main rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-accent outline-none">
        </div>
        <div class="flex gap-2 justify-end">
          <button type="button" onclick="closeEditModal()" class="px-4 py-2 text-secondary hover:text-primary">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-accent hover:opacity-90 text-[#0B0D10] rounded-md font-medium">Save</button>
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
    
    // Client-side duplicate validation
    function validateSlug(input, originalSlug = '') {
      const slug = input.value.trim().toLowerCase();
      const existingSlugs = ${JSON.stringify(links.map(l => l.name.toLowerCase()))};
      
      if (slug === originalSlug.toLowerCase()) return true; // Same as original, allow
      if (existingSlugs.includes(slug)) {
        input.setCustomValidity('Short URL "' + slug + '" already exists! Please choose a different name.');
        return false;
      }
      input.setCustomValidity('');
      return true;
    }
    
    function validateCreateForm(event) {
      const keyInput = event.target.querySelector('input[name="key"]');
      if (!validateSlug(keyInput)) {
        keyInput.reportValidity();
        return false;
      }
      return true;
    }
    
    // Real-time click counter updates
    function updateClickCount(slug, newCount) {
      const clickElements = document.querySelectorAll('[data-click-slug="' + slug + '"]');
      clickElements.forEach(element => {
        const clickSpan = element.querySelector('.click-count');
        if (clickSpan) {
          clickSpan.textContent = newCount;
        }
      });
    }
    
    // Poll for click updates every 5 seconds
    function startClickPolling() {
      const currentSlugs = ${JSON.stringify(links.map(l => l.name))};
      
      // Filter out invalid slugs
      const validSlugs = currentSlugs.filter(slug => 
        slug && typeof slug === 'string' && slug.length > 0 && !slug.includes(' ') && !slug.includes('/')
      );
      
      console.log('Valid slugs for polling:', validSlugs);
      
      setInterval(async () => {
        for (const slug of validSlugs) {
          try {
            const encodedSlug = encodeURIComponent(slug);
            const response = await fetch('/api/get-clicks/' + encodedSlug);
            if (response.ok) {
              const data = await response.json();
              updateClickCount(slug, data.clicks);
            } else if (response.status === 404) {
              // Link was deleted, stop polling for this slug
              console.log('Link no longer exists:', slug);
              continue;
            }
          } catch (error) {
            // Silent fail, don't annoy user
            console.log('Polling error for slug:', slug, error.message);
          }
        }
      }, 5000); // Poll every 5 seconds
    }
    
    // Start polling after page loads
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(startClickPolling, 1000);
    });
    document.addEventListener('DOMContentLoaded', function() {
      const createForm = document.querySelector('form[action="/api/save"]');
      if (createForm) {
        createForm.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const formData = new FormData(createForm);
          const key = formData.get('key').trim();
          const url = formData.get('url').trim();
          
          if (!key || !url) {
            alert('Please fill in all fields');
            return;
          }
          
          try {
            const response = await fetch('/api/save', { 
              method: 'POST', 
              body: formData 
            });
            
            if (response.ok) {
              // Check if response is a redirect (success) or error
              const text = await response.text();
              if (text.includes('already exists')) {
                // Server returned error, execute the script
                document.body.innerHTML = text;
              } else {
                // Success, reload the page
                location.reload();
              }
            } else {
              alert('Error creating link');
            }
          } catch (error) {
            alert('Error: ' + error.message);
          }
        });
      }
    });
    
    document.getElementById('editForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const oldKey = document.getElementById('editOldKey').value;
      const newKey = document.getElementById('editNewKey').value;
      const url = document.getElementById('editUrl').value;
      
      // Load and display basic stats
    async function loadStats() {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const stats = await response.json();
          
          document.getElementById('totalLinksStat').textContent = stats.totalLinks;
          document.getElementById('totalClicksStat').textContent = stats.totalClicks;
          document.getElementById('avgClicksStat').textContent = stats.averageClicks;
          document.getElementById('todayClicksStat').textContent = stats.todayClicks;
          
          if (stats.mostPopular) {
            document.getElementById('mostPopularSlug').textContent = stats.mostPopular.slug;
            document.getElementById('mostPopularClicks').textContent = stats.mostPopular.clicks;
            document.getElementById('mostPopularStat').classList.remove('hidden');
          }
        }
      } catch (error) {
        // Silent fail - stats not critical
        console.error('Failed to load stats:', error);
      }
    }
    
    // Load stats on page load
    document.addEventListener('DOMContentLoaded', function() {
      loadStats();
    });
      const newKeyInput = document.getElementById('editNewKey');
      if (!validateSlug(newKeyInput, oldKey)) {
        newKeyInput.reportValidity();
        return;
      }
      
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
