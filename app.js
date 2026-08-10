
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const cfg=()=>({url:(localStorage.getItem('tbop_supabase_url')||window.TBOP_SUPABASE_URL||'').trim(),key:(localStorage.getItem('tbop_supabase_key')||window.TBOP_SUPABASE_KEY||'').trim()});
const configured=()=>{const c=cfg();return /^https:\/\/.+\.supabase\.co\/?$/.test(c.url)&&c.key&&!c.key.startsWith('YOUR_')};
let sb=null; const client=()=>{if(sb)return sb;if(!configured()||!window.supabase)return null;const c=cfg();sb=window.supabase.createClient(c.url,c.key);return sb};
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const fmtDate=s=>{if(!s)return'';const d=new Date(s+'T12:00:00');return d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})};
function nav(){const b=$('.menu-toggle'),m=$('.menu');if(b&&m)b.onclick=()=>{const o=m.classList.toggle('open');b.setAttribute('aria-expanded',o)};}
async function solar(){
  const hasSolar=['sfi','kp','sfi-large','kp-large','r-scale','g-scale','hf-band-grid'].some(id=>document.getElementById(id));
  if(!hasSolar)return;
  const refresh=$('#solar-refresh');
  const updated=$('#solar-updated');
  if(refresh){refresh.disabled=true;refresh.textContent='↻ Loading…'}
  if(updated)updated.textContent='Loading current NOAA measurements…';
  const fetchJson=async urls=>{
    let lastErr;
    for(const url of urls){
      try{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error(String(r.status));return await r.json()}catch(e){lastErr=e}
    }
    throw lastErr||Error('No data source available');
  };
  const deepNumbers=(obj,names)=>{
    const wanted=names.map(x=>x.toLowerCase()); let found=[];
    const walk=(v,k='')=>{if(v&&typeof v==='object'){if(Array.isArray(v)){v.forEach(x=>walk(x,k));}else Object.entries(v).forEach(([kk,vv])=>walk(vv,kk));return}const n=Number(v);if(Number.isFinite(n)&&wanted.some(w=>String(k).toLowerCase().includes(w)))found.push(n)};
    walk(obj); return found;
  };
  const parseFlux=data=>{
    if(data&&typeof data==='object'&&!Array.isArray(data)){for(const k of ['Flux','flux','f107','observed_flux','value']){const n=Number(data[k]);if(Number.isFinite(n))return n}}
    if(Array.isArray(data)){
      for(let i=data.length-1;i>=0;i--){const row=data[i];if(Array.isArray(row)){for(let j=row.length-1;j>=0;j--){const n=Number(row[j]);if(Number.isFinite(n)&&n>50&&n<500)return n}}else if(row&&typeof row==='object'){for(const k of ['flux','f107','observed_flux','Flux','value']){const n=Number(row[k]);if(Number.isFinite(n))return n}}}
    }
    return deepNumbers(data,['flux','f107'])[0];
  };
  const parseKp=data=>{
    if(Array.isArray(data)){for(let i=data.length-1;i>=0;i--){const row=data[i];if(Array.isArray(row)){const candidates=row.map(Number).filter(n=>Number.isFinite(n)&&n>=0&&n<=9);if(candidates.length)return candidates.at(-1)}else if(row&&typeof row==='object'){for(const k of ['kp_index','kp','Kp']){const n=Number(row[k]);if(Number.isFinite(n))return n}}}}
    const vals=deepNumbers(data,['kp_index','kp']);return vals.at(-1);
  };
  const parseScale=(data,key)=>{try{const current=data?.['0']||data?.[0]||data;const x=current?.[key]||current?.[key.toLowerCase()];const n=Number(x?.Scale??x?.scale??x);return Number.isFinite(n)?n:null}catch{return null}};
  const setText=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val};
  const status=(id,text,cls='neutral')=>{const e=document.getElementById(id);if(e){e.textContent=text;e.className='metric-status '+cls}};
  const setBand=(band,label,cls)=>{const e=document.querySelector(`[data-band="${band}"] .band-rating`);if(e){e.textContent=label;e.className='band-rating '+cls}};
  const rateBands=(f,k)=>{
    const storm=k>=5, active=k>=4;
    const rate=(minGood,minFair)=>storm?['POOR','poor']:(f>=minGood&&!active?['GOOD','good']:f>=minFair&&k<=4?['FAIR','fair']:['POOR','poor']);
    [['10m',150,105],['12m',140,100],['15m',125,90],['17m',110,85],['20m',90,75]].forEach(([b,g,fa])=>{const r=rate(g,fa);setBand(b,r[0],r[1])});
    const low=storm?['POOR','poor']:k<=2?['GOOD','good']:k<=4?['FAIR','fair']:['POOR','poor'];
    ['30m','40m','80m'].forEach(b=>setBand(b,low[0],low[1]));
  };
  try{
    const [fluxData,kpData,scaleData]=await Promise.all([
      fetchJson(['https://services.swpc.noaa.gov/products/summary/10cm-flux.json','https://services.swpc.noaa.gov/json/f107_cm_flux.json']),
      fetchJson(['https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json']),
      fetchJson(['https://services.swpc.noaa.gov/products/noaa-scales.json']).catch(()=>null)
    ]);
    const fv=Number(parseFlux(fluxData)), kv=Number(parseKp(kpData));
    if(!Number.isFinite(fv)||!Number.isFinite(kv))throw Error('Could not parse NOAA data');
    ['sfi','sfi-large'].forEach(id=>setText(id,Math.round(fv))); ['kp','kp-large'].forEach(id=>setText(id,kv.toFixed(1)));
    const rs=parseScale(scaleData,'R'), gs=parseScale(scaleData,'G');
    setText('r-scale',rs===null?'—':'R'+rs);setText('g-scale',gs===null?'—':'G'+gs);
    status('r-label',rs===null?'NOAA scale':rs===0?'None':rs<=2?'Minor / Moderate':'Strong+',rs===0?'good':rs<=2?'fair':'poor');
    status('g-label',gs===null?'NOAA scale':gs===0?'None':gs<=2?'Minor / Moderate':'Strong+',gs===0?'good':gs<=2?'fair':'poor');
    status('sfi-label',fv>=150?'Strong':fv>=110?'Good':fv>=85?'Moderate':'Low',fv>=110?'good':fv>=85?'fair':'poor');
    status('kp-label',kv<=2?'Quiet':kv<=4?'Unsettled':kv<5?'Active':'Storm',kv<=2?'good':kv<=4?'fair':'poor');
    let label='GOOD',cls='good',title='Good HF Conditions',copy='Quiet geomagnetic conditions with useful solar support. Upper HF bands may offer good opportunities depending on time and path.';
    if(kv>=5){label='DISTURBED';cls='poor';title='Disturbed HF Conditions';copy='Geomagnetic storming may disrupt HF propagation, especially northern and polar paths.'}
    else if(kv>=3||fv<100){label='FAIR';cls='fair';title='Fair HF Conditions';copy='Mixed conditions. Lower and middle HF bands may remain useful while upper bands can be more path-dependent.'}
    setText('propagation-title',title);setText('propagation-copy',copy);const badge=$('#solar-badge-large');if(badge){badge.textContent=label;badge.className='condition-badge '+cls}
    rateBands(fv,kv);
    if(kv>=5){setText('two-meter-note','Geomagnetic activity is elevated. Auroral VHF effects are possible at higher latitudes; normal repeater/local paths may still be usable.');setText('seventy-note','Solar storming does not directly predict 70 cm range. Check local weather/tropo and repeater coverage.');const a=$('#two-meter-rating');if(a){a.textContent='WATCH';a.className='condition-badge fair'}}
    else{setText('two-meter-note','Normal local/repeater operation expected. Solar conditions mainly matter during unusual auroral events.');setText('seventy-note','Normal local/repeater operation expected. Tropo, terrain and antenna height usually matter more than F10.7.');}
    if(updated)updated.textContent='Updated '+new Date().toLocaleString()+' · NOAA SWPC';
  }catch(e){
    ['sfi-large','kp-large','r-scale','g-scale'].forEach(id=>setText(id,'—'));setText('propagation-title','Live data unavailable');setText('propagation-copy','NOAA data could not be loaded right now. Use the NOAA SWPC link below and try Refresh Data again.');if(updated)updated.textContent='Unable to load NOAA data.';
  }finally{if(refresh){refresh.disabled=false;refresh.textContent='↻ Refresh Data'}}
}

function vhfTabs(){}
async function publicNews(){const targets=[$('#news-list'),$('#news-page-list')].filter(Boolean);if(!targets.length)return;const c=client();if(!c){targets.forEach(t=>t.innerHTML='<div class="notice">Club news will appear here after the site is connected to Supabase.</div>');return}const {data,error}=await c.from('news').select('*').eq('published',true).order('published_at',{ascending:false}).limit($('#news-page-list')?50:3);const html=error||!data?.length?'<div class="notice">No club news has been published yet.</div>':data.map(n=>`<article class="news-row"><div class="row-meta">${new Date(n.published_at||n.created_at).toLocaleDateString()}</div><h3>${esc(n.title)}</h3><p>${esc(n.body).replace(/\n/g,'<br>')}</p></article>`).join('');targets.forEach(t=>t.innerHTML=html)}
async function publicEvents(){
  const t=$('#event-list'); const nextTitle=$('#next-event-title'); const c=client();
  if(!t&&!nextTitle)return;
  if(!c){if(t)t.innerHTML='<div class="notice">Events will appear here after the site is connected to Supabase.</div>';return}
  const today=new Date().toISOString().slice(0,10);
  const {data,error}=await c.from('events').select('*').gte('event_date',today).order('event_date',{ascending:true}).order('starts_at',{ascending:true,nullsFirst:false});
  const timeText=e=>e.starts_at?new Date(e.starts_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'';
  if(t)t.innerHTML=error||!data?.length?'<div class="notice">No upcoming events have been posted.</div>':data.map(e=>`<article class="event-row"><div class="row-meta">${fmtDate(e.event_date)}${timeText(e)?' · '+esc(timeText(e)):''}</div><h3>${esc(e.title)}</h3>${e.location?`<strong>${esc(e.location)}</strong>`:''}${e.description?`<p>${esc(e.description).replace(/\n/g,'<br>')}</p>`:''}</article>`).join('');
  if(data?.[0]){nextTitle?.replaceChildren(document.createTextNode(data[0].title));$('#next-event-date')?.replaceChildren(document.createTextNode(fmtDate(data[0].event_date)+(timeText(data[0])?' · '+timeText(data[0]):'')+(data[0].location?' · '+data[0].location:'')))}
}
async function publicDocs(){const t=$('#documents-list');if(!t)return;const c=client();if(!c){t.innerHTML='<div class="notice">The online document library will appear here after Supabase setup. The membership application remains available on the Membership page.</div>';return}const {data,error}=await c.from('documents').select('*').eq('published',true).order('category').order('created_at',{ascending:false});if(error||!data?.length){t.innerHTML='<div class="notice">No public documents have been published yet.</div>';return}const groups={};data.forEach(d=>(groups[d.category||'Other']??=[]).push(d));t.innerHTML=Object.entries(groups).map(([cat,rows])=>`<section class="document-group"><div class="doc-category-head"><h2>${esc(cat)}</h2><span>${rows.length} document${rows.length===1?'':'s'}</span></div>${rows.map(d=>`<article class="doc-row"><div><h3>${esc(d.title)}</h3>${d.description?`<p>${esc(d.description)}</p>`:''}<small>${new Date(d.created_at).toLocaleDateString()}</small></div><a class="btn small" target="_blank" rel="noopener" href="${esc(d.file_url)}">Open PDF</a></article>`).join('')}</section>`).join('')}
function setup(){const f=$('#setup-form');if(!f)return;const url=$('#setup-url'),key=$('#setup-key'),msg=$('#setup-message'),out=$('#config-output'),card=$('#config-output-card');url.value=localStorage.getItem('tbop_supabase_url')||'';key.value=localStorage.getItem('tbop_supabase_key')||'';const make=()=>`// TBOP v3 Supabase configuration\nwindow.TBOP_SUPABASE_URL = '${url.value.trim().replace(/'/g,"\\'")}';\nwindow.TBOP_SUPABASE_KEY = '${key.value.trim().replace(/'/g,"\\'")}';\n`;f.onsubmit=async e=>{e.preventDefault();try{const test=window.supabase.createClient(url.value.trim(),key.value.trim());const {error}=await test.from('news').select('id').limit(1);if(error&&!['PGRST116'].includes(error.code))throw error;msg.className='admin-message ok';msg.textContent='Connection successful. You can use this Supabase project for TBOP v3.';out.value=make();card.classList.remove('hidden')}catch(err){msg.className='admin-message error';msg.textContent='Connection failed: '+(err.message||err)}};$('#save-local').onclick=()=>{localStorage.setItem('tbop_supabase_url',url.value.trim());localStorage.setItem('tbop_supabase_key',key.value.trim());msg.className='admin-message ok';msg.textContent='Saved on this device for testing. Create the permanent config file for all devices.';out.value=make();card.classList.remove('hidden')};$('#copy-config').onclick=async()=>{await navigator.clipboard.writeText(out.value);msg.className='admin-message ok';msg.textContent='Configuration copied.'}}
async function admin(){
  if(!$('#login-form'))return;
  const c=client();
  if(!c){$('#config-warning').classList.remove('hidden');return}
  const login=$('#login-panel'),dash=$('#dashboard'),lm=$('#login-message'),am=$('#admin-message');
  const message=(text,type='ok')=>{am.className='admin-message '+type;am.textContent=text;setTimeout(()=>{if(am.textContent===text)am.textContent=''},4500)};
  async function authorized(user){if(!user)return false;const {data,error}=await c.rpc('is_site_admin');return !error&&data===true}
  async function show(session){
    if(session?.user&&await authorized(session.user)){
      login.classList.add('hidden');dash.classList.remove('hidden');$('#admin-identity').textContent=session.user.email;await reloadAll();
    }else{
      dash.classList.add('hidden');login.classList.remove('hidden');
      if(session?.user){lm.className='admin-message error';lm.textContent='This account signed in but is not on the TBOP administrator list.';await c.auth.signOut()}
    }
  }
  const {data:{session}}=await c.auth.getSession();await show(session);
  $('#login-form').onsubmit=async e=>{e.preventDefault();lm.textContent='Signing in…';const {data,error}=await c.auth.signInWithPassword({email:$('#login-email').value.trim(),password:$('#login-password').value});if(error){lm.className='admin-message error';lm.textContent=error.message;return}await show(data.session)};
  $('#logout-btn').onclick=async()=>{await c.auth.signOut();location.reload()};
  $$('.admin-tab').forEach(b=>b.onclick=()=>{$$('.admin-tab,.admin-panel').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(`[data-panel="${b.dataset.tab}"]`).classList.add('active')});

  async function reloadAll(){await Promise.all([loadDocs(),loadNews(),loadEvents()])}

  async function loadDocs(){
    const {data,error}=await c.from('documents').select('*').order('created_at',{ascending:false});
    if(error){$('#admin-documents').innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}
    $('#admin-documents').innerHTML=!data?.length?'<div class="notice">No documents yet.</div>':data.map(d=>`<div class="admin-list-row"><div><strong>${esc(d.title)}</strong><small>${esc(d.category)} · ${new Date(d.created_at).toLocaleDateString()}</small></div><div class="row-actions"><a class="btn small" href="${esc(d.file_url)}" target="_blank" rel="noopener">Open</a><button class="btn danger small" data-del-doc="${d.id}" data-path="${esc(d.storage_path)}">Delete</button></div></div>`).join('');
    $$('[data-del-doc]').forEach(b=>b.onclick=async()=>{if(!confirm('Delete this document?'))return;await c.storage.from('documents').remove([b.dataset.path]);const {error}=await c.from('documents').delete().eq('id',b.dataset.delDoc);if(error)message(error.message,'error');else{message('Document deleted.');loadDocs()}})
  }
  const fileInput=$('#doc-file'),fileName=$('#doc-file-name'),drop=$('#doc-drop');
  let droppedFile=null;
  const isPdf=file=>!!file&&(file.type==='application/pdf'||file.name?.toLowerCase().endsWith('.pdf'));
  const chooseFile=file=>{
    if(!file)return false;
    if(!isPdf(file)){message('Please choose a PDF file.','error');return false}
    droppedFile=file;
    fileName.textContent=file.name;
    if(!$('#doc-title').value.trim())$('#doc-title').value=file.name.replace(/\.pdf$/i,'').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim();
    return true;
  };
  fileInput?.addEventListener('change',()=>chooseFile(fileInput.files?.[0]));
  if(drop){
    ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{
      e.preventDefault();e.stopPropagation();
      if(e.dataTransfer)e.dataTransfer.dropEffect='copy';
      drop.classList.add('dragging');
    }));
    ['dragleave','dragend'].forEach(ev=>drop.addEventListener(ev,e=>{
      e.preventDefault();e.stopPropagation();drop.classList.remove('dragging');
    }));
    drop.addEventListener('drop',e=>{
      e.preventDefault();e.stopPropagation();drop.classList.remove('dragging');
      const file=e.dataTransfer?.files?.[0];
      if(file)chooseFile(file);
    });
  }
  $('#document-form').onsubmit=async e=>{
    e.preventDefault();const file=droppedFile||fileInput.files?.[0];if(!file){message('Choose or drag a PDF into the upload box first.','error');return}
    const title=$('#doc-title').value.trim()||file.name.replace(/\.pdf$/i,'').replace(/[-_]+/g,' ').trim();
    const path=`${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
    message('Uploading and publishing…','warn');
    const up=await c.storage.from('documents').upload(path,file,{contentType:'application/pdf',upsert:false});if(up.error){message(up.error.message,'error');return}
    const {data:url}=c.storage.from('documents').getPublicUrl(path);
    const {error}=await c.from('documents').insert({title,category:$('#doc-category').value,description:$('#doc-description').value.trim(),file_url:url.publicUrl,storage_path:path,published:true});
    if(error){await c.storage.from('documents').remove([path]);message(error.message,'error');return}
    e.target.reset();droppedFile=null;fileName.textContent='Tap here or drag a PDF onto this box';message('Document is live on the public site.');loadDocs();
  };

  async function loadNews(){
    const {data,error}=await c.from('news').select('*').order('created_at',{ascending:false});
    if(error){$('#admin-news').innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}
    $('#admin-news').innerHTML=!data?.length?'<div class="notice">No news yet.</div>':data.map(n=>`<div class="admin-list-row"><div><strong>${esc(n.title)}</strong><small>${n.published?'Published':'Draft'}</small></div><div class="row-actions"><button class="btn small" data-edit-news="${n.id}">Edit</button><button class="btn danger small" data-del-news="${n.id}">Delete</button></div></div>`).join('');
    $$('[data-edit-news]').forEach(b=>b.onclick=()=>{const n=data.find(x=>String(x.id)===b.dataset.editNews);if(!n)return;$('#news-id').value=n.id;$('#news-title').value=n.title;$('#news-body').value=n.body;$('#news-published').checked=!!n.published;$('#news-title').focus()});
    $$('[data-del-news]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this article?')){const {error}=await c.from('news').delete().eq('id',b.dataset.delNews);if(error)message(error.message,'error');else{message('Article deleted.');loadNews()}}})
  }
  $('#news-form').onsubmit=async e=>{
    e.preventDefault();
    const id=$('#news-id').value, now=new Date().toISOString(), isPublished=$('#news-published').checked;
    const p={title:$('#news-title').value.trim(),body:$('#news-body').value.trim(),published:isPublished,published_at:isPublished?now:null,updated_at:now};
    const r=id?await c.from('news').update(p).eq('id',id):await c.from('news').insert(p);
    if(r.error)message(r.error.message,'error');else{e.target.reset();$('#news-id').value='';$('#news-published').checked=true;message('News saved.');loadNews();publicNews()}
  };

  const eventTime=v=>v?.starts_at?new Date(v.starts_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false}):'';
  async function loadEvents(){
    const {data,error}=await c.from('events').select('*').order('event_date',{ascending:true}).order('starts_at',{ascending:true,nullsFirst:false});
    if(error){$('#admin-events').innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}
    $('#admin-events').innerHTML=!data?.length?'<div class="notice">No events yet.</div>':data.map(v=>`<div class="admin-list-row"><div><strong>${esc(v.title)}</strong><small>${fmtDate(v.event_date)}${eventTime(v)?' · '+esc(eventTime(v)):''}${v.location?' · '+esc(v.location):''}</small></div><div class="row-actions"><button class="btn small" data-edit-event="${v.id}">Edit</button><button class="btn danger small" data-del-event="${v.id}">Delete</button></div></div>`).join('');
    $$('[data-edit-event]').forEach(b=>b.onclick=()=>{const v=data.find(x=>String(x.id)===b.dataset.editEvent);if(!v)return;$('#event-id').value=v.id;$('#event-title').value=v.title;$('#event-date').value=v.event_date;$('#event-time').value=eventTime(v);$('#event-location').value=v.location||'';$('#event-description').value=v.description||'';$('#event-title').focus()});
    $$('[data-del-event]').forEach(b=>b.onclick=async()=>{if(confirm('Delete this event?')){const {error}=await c.from('events').delete().eq('id',b.dataset.delEvent);if(error)message(error.message,'error');else{message('Event deleted.');loadEvents();publicEvents()}}})
  }
  $('#event-form').onsubmit=async e=>{
    e.preventDefault();
    const id=$('#event-id').value, date=$('#event-date').value, time=$('#event-time').value;
    const startsAt=time?new Date(`${date}T${time}:00`).toISOString():null;
    const p={title:$('#event-title').value.trim(),event_date:date,starts_at:startsAt,location:$('#event-location').value.trim()||null,description:$('#event-description').value.trim()||null};
    if(!id){const {data:{user}}=await c.auth.getUser();if(user)p.created_by=user.id}
    const r=id?await c.from('events').update(p).eq('id',id):await c.from('events').insert(p);
    if(r.error)message(r.error.message,'error');else{e.target.reset();$('#event-id').value='';message('Event saved.');loadEvents();publicEvents()}
  };

}
window.addEventListener('DOMContentLoaded',()=>{nav();solar();vhfTabs();publicNews();publicEvents();publicDocs();setup();admin()});

document.addEventListener('click',e=>{if(e.target&&e.target.id==='solar-refresh')solar()});
})();
