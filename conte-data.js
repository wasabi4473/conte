(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ConteData = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SCHEMA_VERSION = 1;
  function makeId(prefix) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
  function normalizeCut(cut) {
    const value = cut && typeof cut === 'object' ? cut : {};
    if (!value.id) value.id = makeId('c');
    if (!Array.isArray(value.cams)) value.cams = [];
    if (!value.audio || typeof value.audio !== 'object') value.audio = { narration:'', dialogue:value.dialogue||'', lyrics:'', bgm:'', se:'', sl:'' };
    return value;
  }
  function normalizeProject(project) {
    const value = project && typeof project === 'object' ? project : {};
    if (!value.id) value.id = makeId('p');
    if (!Array.isArray(value.cuts)) value.cuts = [];
    if (!Array.isArray(value.sequences)) value.sequences = [];
    if (typeof value.script !== 'string') value.script = '';
    if (!['cut','continuous'].includes(value.conteMode)) value.conteMode = 'cut';
    if (!['horizontal','vertical','free'].includes(value.flowDirection)) value.flowDirection = 'horizontal';
    value.cuts = value.cuts.map(normalizeCut);
    value.sequences = value.sequences.map(sequence => {
      const seq = sequence && typeof sequence === 'object' ? sequence : {};
      if (!seq.id) seq.id = makeId('s');
      if (!Array.isArray(seq.cuts)) seq.cuts = [];
      seq.cuts = seq.cuts.map(normalizeCut);
      return seq;
    });
    if (!Array.isArray(value.continuousBlocks)) value.continuousBlocks = [];
    value.continuousBlocks = value.continuousBlocks.map(block => {
      const item = block && typeof block === 'object' ? block : {};
      if (!item.id) item.id = makeId('b');
      if (typeof item.title !== 'string') item.title = '';
      if (!['horizontal','vertical'].includes(item.direction)) item.direction = 'horizontal';
      if (!Array.isArray(item.points)) item.points = [];
      item.points = item.points.map(normalizeCut);
      return item;
    });
    if (!Array.isArray(value.timelineItems)) {
      if (value.conteMode === 'continuous' && value.cuts.length) {
        const block = { id:makeId('b'), title:value.title||'長回し', direction:value.flowDirection==='vertical'?'vertical':'horizontal', points:value.cuts };
        value.continuousBlocks.push(block);
        value.cuts = [];
        value.timelineItems = [{ kind:'continuous', id:block.id }];
      } else {
        value.timelineItems = value.cuts.map(cut => ({ kind:'cut', id:cut.id }));
      }
    }
    value.timelineItems = value.timelineItems.filter(item => item && (item.kind==='cut' || item.kind==='continuous') && item.id);
    value.conteMode = 'cut';
    return value;
  }
  function migrateProjects(input) {
    if (!Array.isArray(input)) throw new TypeError('CONTEのプロジェクト配列ではありません');
    return input.map(normalizeProject);
  }
  function validateProjects(input) {
    if (!Array.isArray(input)) return { ok:false, message:'プロジェクト配列ではありません' };
    if (input.some(project => !project || typeof project !== 'object')) return { ok:false, message:'壊れたプロジェクトが含まれています' };
    return { ok:true };
  }
  return { SCHEMA_VERSION, makeId, migrateProjects, normalizeProject, validateProjects };
});

