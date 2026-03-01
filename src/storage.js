// Storage utilities - handles both KV (production) and in-memory (local dev)

// Local in-memory storage for development (fallback when KV not available)
const localLinks = new Map();

// Helper to parse link data from various formats
function parseLinkData(data) {
  // If already an object with url property, return it
  if (data && typeof data === 'object' && data.url) {
    return { url: data.url, clicks: data.clicks || 0 };
  }
  
  // If it's a string, try to parse as JSON
  if (typeof data === 'string') {
    // Try JSON parsing
    try {
      const parsed = JSON.parse(data);
      
      // If the parsed result is an object with url property, return it
      if (parsed && typeof parsed === 'object' && parsed.url) {
        return { url: parsed.url, clicks: parsed.clicks || 0 };
      } else if (typeof parsed === 'string') {
        // If the parsed result is still a string, it might be a nested JSON string
        // So try parsing again
        try {
          const doubleParsed = JSON.parse(parsed);
          if (doubleParsed && typeof doubleParsed === 'object' && doubleParsed.url) {
            return { url: doubleParsed.url, clicks: doubleParsed.clicks || 0 };
          }
        } catch {
          // Ignore error and continue
        }
        // If double parsing didn't work, return the original string as URL
        return { url: parsed, clicks: 0 };
      } else {
        // If it's neither an object with url nor a string, return as URL
        return { url: data, clicks: 0 };
      }
    } catch {
      // JSON parse failed - treat as plain URL string
      return { url: data, clicks: 0 };
    }
  }
  
  // Fallback
  return { url: String(data || ''), clicks: 0 };
}

export function createStorage(env) {
  const hasKV = env.SHORT_LINKS != null;
  
  return {
    async getLink(key) {
      if (hasKV) {
        const data = await env.SHORT_LINKS.get(key);
        if (!data) return null;
        return parseLinkData(data);
      }
      const data = localLinks.get(key);
      if (!data) return null;
      return parseLinkData(data);
    },
    
    async saveLink(key, value) {
      const data = typeof value === 'string' ? { url: value, clicks: 0 } : value;
      // Add creation timestamp if not already present
      if (!data.created) {
        data.created = Date.now();
      }
      const json = JSON.stringify(data);
      if (hasKV) return env.SHORT_LINKS.put(key, json);
      localLinks.set(key, json);
    },
    
    async incrementClicks(key) {
      if (hasKV) {
        const data = await env.SHORT_LINKS.get(key);
        if (!data) return;
        const parsed = parseLinkData(data);
        parsed.clicks = (parsed.clicks || 0) + 1;
        await env.SHORT_LINKS.put(key, JSON.stringify(parsed));
      } else {
        const data = localLinks.get(key);
        if (!data) return;
        const parsed = parseLinkData(data);
        parsed.clicks = (parsed.clicks || 0) + 1;
        localLinks.set(key, JSON.stringify(parsed));
      }
    },
    
    async deleteLink(key) {
      if (hasKV) return env.SHORT_LINKS.delete(key);
      localLinks.delete(key);
    },
    
    async listKeys(limit = 10, cursor = null) {
      if (hasKV) {
        const result = await env.SHORT_LINKS.list({ limit, cursor });
        const keysWithUrls = await Promise.all(
          result.keys.map(async (k) => {
            const data = await env.SHORT_LINKS.get(k.name);
            const parsed = parseLinkData(data);
            return {
              name: k.name,
              url: parsed.url,
              clicks: parsed.clicks,
              created: parsed.created || Date.now() // Fallback for existing links
            };
          })
        );
        
        // Sort by creation time (newest first) for better UX
        keysWithUrls.sort((a, b) => (b.created || 0) - (a.created || 0));
        return {
          links: keysWithUrls,
          cursor: result.list_complete ? null : result.cursor,
          total: null // Not needed without stats
        };
      }
      // Local storage: maintain consistent cursor handling
      const allLinks = Array.from(localLinks.entries()).map(([name, data]) => {
        const parsed = parseLinkData(data);
        return { name, url: parsed.url, clicks: parsed.clicks, created: parsed.created || Date.now() };
      });
      // Sort by creation time (newest first) for better UX
      allLinks.sort((a, b) => (b.created || 0) - (a.created || 0));
      
      const start = cursor ? parseInt(cursor) : 0;
      const pageLinks = allLinks.slice(start, start + limit);
      return {
        links: pageLinks,
        cursor: start + limit < allLinks.length ? String(start + limit) : null,
        total: allLinks.length
      };
    },
    
    async search(query, limit = 10, cursor = null) {
      if (hasKV) {
        // For KV, we need to get all keys and filter, then paginate
        const result = await env.SHORT_LINKS.list({ limit: 1000 }); // Get more for search
        const allKeys = result.keys.map(k => k.name);
        
        const filteredKeys = allKeys.filter(name => 
          name.toLowerCase().includes(query.toLowerCase())
        );
        
        // Paginate filtered results
        const start = cursor ? parseInt(cursor) : 0;
        const paginatedKeys = filteredKeys.slice(start, start + limit);
        
        const keysWithUrls = await Promise.all(
          paginatedKeys.map(async (name) => {
            const data = await env.SHORT_LINKS.get(name);
            const parsed = parseLinkData(data);
            return {
              name,
              url: parsed.url,
              clicks: parsed.clicks
            };
          })
        );
        
        return {
          links: keysWithUrls,
          cursor: start + limit < filteredKeys.length ? String(start + limit) : null,
          total: filteredKeys.length
        };
      }
      
      // Local storage search with pagination
      const allLinks = Array.from(localLinks.entries()).map(([name, data]) => {
        const parsed = parseLinkData(data);
        return { name, url: parsed.url, clicks: parsed.clicks };
      });
      
      // Sort by name for consistent ordering
      allLinks.sort((a, b) => a.name.localeCompare(b.name));
      
      const q = query.toLowerCase();
      const filteredLinks = allLinks.filter(link => 
        link.name.toLowerCase().includes(q) || 
        link.url.toLowerCase().includes(q)
      );
      
      const start = cursor ? parseInt(cursor) : 0;
      const pageLinks = filteredLinks.slice(start, start + limit);
      
      return {
        links: pageLinks,
        cursor: start + limit < filteredLinks.length ? String(start + limit) : null,
        total: filteredLinks.length
      };
    }
  };
}
