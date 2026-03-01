// Storage utilities - handles both KV (production) and in-memory (local dev)

// Local in-memory storage for development (fallback when KV not available)
const localLinks = new Map();

export function createStorage(env) {
  const hasKV = env.SHORT_LINKS != null;
  
  return {
    async getLink(key) {
      if (hasKV) return env.SHORT_LINKS.get(key);
      return localLinks.get(key);
    },
    
    async saveLink(key, value) {
      if (hasKV) return env.SHORT_LINKS.put(key, value);
      localLinks.set(key, value);
    },
    
    async deleteLink(key) {
      if (hasKV) return env.SHORT_LINKS.delete(key);
      localLinks.delete(key);
    },
    
    async listKeys() {
      if (hasKV) {
        const result = await env.SHORT_LINKS.list();
        const keysWithUrls = await Promise.all(
          result.keys.map(async (k) => ({
            name: k.name,
            url: await env.SHORT_LINKS.get(k.name)
          }))
        );
        return keysWithUrls;
      }
      return Array.from(localLinks.entries()).map(([name, url]) => ({ name, url }));
    }
  };
}
