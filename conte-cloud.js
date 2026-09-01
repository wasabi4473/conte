(function (root) {
  'use strict';

  let client = null;
  let session = null;
  let syncTimer = null;
  let listeners = [];

  function emit(state) { listeners.forEach(listener => listener(state)); }
  function state(extra) { return Object.assign({ signedIn:!!session, email:session?.user?.email||'', syncing:false }, extra||{}); }

  async function init() {
    const config = root.CONTE_SUPABASE_CONFIG;
    if (!config || !root.supabase) return state({ available:false, error:'クラウド機能を読み込めませんでした' });
    client = root.supabase.createClient(config.url, config.publishableKey, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true }
    });
    const result = await client.auth.getSession();
    session = result.data.session;
    client.auth.onAuthStateChange((_event, nextSession) => { session=nextSession; emit(state({ available:true })); });
    const value=state({ available:true, error:result.error?.message||'' });
    emit(value);
    return value;
  }

  async function signInWithPassword(email, password) {
    if (!client) throw new Error('クラウド機能が準備できていません');
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function setPassword(password) {
    if (!client || !session) throw new Error('先にログインしてください');
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
  }

  async function signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }

  async function sync(localProjects) {
    if (!client || !session) return { ok:false, skipped:true };
    emit(state({ available:true, syncing:true }));
    try {
      const userId=session.user.id;
      const { data, error }=await client.from('conte_projects').select('data,client_updated_at').is('deleted_at',null);
      if (error) throw error;
      const merged=new Map(localProjects.map(project=>[project.id,project]));
      const cloudById=new Map((data||[]).filter(row=>row.data?.id).map(row=>[row.data.id,row]));
      (data||[]).forEach(row=>{
        const cloud=row.data;
        if (!cloud?.id) return;
        const local=merged.get(cloud.id);
        if (!local || new Date(row.client_updated_at||0).getTime() > Number(local.updatedAt||0)) merged.set(cloud.id,cloud);
      });
      const rows=localProjects
        .filter(project=>{
          const cloud=cloudById.get(project.id);
          return !cloud || Number(project.updatedAt||0) >= new Date(cloud.client_updated_at||0).getTime();
        })
        .map(project => ({
          id:project.id,
          owner_id:userId,
          title:project.title||'',
          data:project,
          schema_version:1,
          client_updated_at:new Date(project.updatedAt||Date.now()).toISOString(),
          deleted_at:null
        }));
      if (rows.length) {
        const upsertResult=await client.from('conte_projects').upsert(rows,{ onConflict:'id' });
        if (upsertResult.error) throw upsertResult.error;
      }
      emit(state({ available:true, syncing:false, lastSyncedAt:Date.now() }));
      return { ok:true, projects:[...merged.values()] };
    } catch (error) {
      emit(state({ available:true, syncing:false, error:error.message }));
      return { ok:false, error };
    }
  }

  function queueSync(projects, onMerged) {
    if (!session) return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(async()=>{
      const result=await sync(projects);
      if (result.ok && onMerged) onMerged(result.projects);
    },800);
  }

  function onStateChange(listener) { listeners.push(listener); return ()=>{listeners=listeners.filter(x=>x!==listener);}; }
  root.ConteCloud={ init, signInWithPassword, setPassword, signOut, sync, queueSync, onStateChange, getSession:()=>session };
})(typeof globalThis !== 'undefined' ? globalThis : this);

