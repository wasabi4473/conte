(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ConteStorage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STORAGE_KEY = 'conte_v4';
  const META_KEY = 'conte_meta_v1';
  function createLocalStorageAdapter(storage) {
    return {
      load() {
        try { const raw=storage.getItem(STORAGE_KEY); return { ok:true, projects:raw?JSON.parse(raw):[] }; }
        catch (error) { return { ok:false, projects:[], error }; }
      },
      save(projects) {
        try {
          storage.setItem(STORAGE_KEY, JSON.stringify(projects));
          storage.setItem(META_KEY, JSON.stringify({ schemaVersion:1, savedAt:Date.now() }));
          return { ok:true };
        } catch (error) { return { ok:false, error }; }
      },
      rawBackup() { return storage.getItem(STORAGE_KEY) || '[]'; }
    };
  }
  return { STORAGE_KEY, META_KEY, createLocalStorageAdapter };
});

