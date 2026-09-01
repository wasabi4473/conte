const assert = require('node:assert/strict');
const data = require('../conte-data.js');
const storageModule = require('../conte-storage.js');
function fakeStorage() {
  const values=new Map();
  return { getItem:key=>values.has(key)?values.get(key):null, setItem:(key,value)=>values.set(key,value) };
}
const legacy=[{ id:'p_1', title:'既存企画', cuts:[{ id:'c_1', dialogue:'台詞' }] }];
const migrated=data.migrateProjects(structuredClone(legacy));
assert.equal(migrated[0].title,'既存企画');
assert.deepEqual(migrated[0].sequences,[]);
assert.equal(migrated[0].cuts[0].audio.dialogue,'台詞');
const memory=fakeStorage();
const adapter=storageModule.createLocalStorageAdapter(memory);
assert.equal(adapter.save(migrated).ok,true);
assert.deepEqual(adapter.load().projects,migrated);
assert.equal(JSON.parse(memory.getItem(storageModule.META_KEY)).schemaVersion,1);
const fullStorage={ getItem:()=>null, setItem:()=>{ throw new Error('QuotaExceededError'); } };
assert.equal(storageModule.createLocalStorageAdapter(fullStorage).save([]).ok,false);
console.log('phase0 tests passed');

