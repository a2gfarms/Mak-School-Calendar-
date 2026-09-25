import {KEY,SUBJECTS,CREATURES,dateKey,parseDate,shiftDate,monday,defaultState,isSchoolDay,entryKey,entry,totalXP,completedCount,validateState,safeURL,csv,calendar,minuteOfDay} from './core.mjs';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (name,cls='') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
let state=defaultState(), rawRecovery='', loadFailed=false;
try { const raw=localStorage.getItem(KEY); if(raw) {rawRecovery=raw;state=validateState(JSON.parse(raw));rawRecovery='';} }
catch {loadFailed=true;}
let currentDay=dateKey(), selectedDate=currentDay, selectedWeek=monday(currentDay), view='today', logFilter='all', focusId='algebra', focusMinutes=25, toastTimeout;
const views=[['today','sun','Today'],['week','calendar','This week'],['log','book','Field notes'],['creatures','mushroom','Creature den'],['settings','settings','Settings']];
let swRegistration=Promise.resolve(null);
if ('serviceWorker' in navigator && location.protocol!=='file:') swRegistration=navigator.serviceWorker.register('./sw.js').catch(()=>null);

function storageError(message) { const box=$('#storage-alert');box.hidden=false;box.innerHTML=message; }
if(loadFailed) storageError(`Your saved grove could not be read. Changes are paused to protect it. ${rawRecovery?'<button class="text-btn" data-action="recover">Download the original data</button>':''} Open Settings to restore a backup, or <button class="text-btn" data-action="fresh">start a new grove</button>.`);
function change(mutate,{replace=false}={}) {
  if(loadFailed&&!replace){toast('Restore a backup or start a new grove to save changes.');return false;}
  try {
    if(!replace){const latest=localStorage.getItem(KEY);if(latest)state=validateState(JSON.parse(latest));}
    const next=structuredClone(state);mutate(next);localStorage.setItem(KEY,JSON.stringify(next));state=next;loadFailed=false;$('#storage-alert').hidden=true;return true;
  } catch(e) { storageError('Your change could not be saved. Check that this browser allows site storage and has free space. Your previously saved progress is unchanged. Download a backup from Settings.');toast('This change was not saved.');return false; }
}
function toast(message){clearTimeout(toastTimeout);$('#toast').textContent=message;$('#toast').classList.add('show');toastTimeout=setTimeout(()=>$('#toast').classList.remove('show'),4500);}
function schedule(id){return state.settings.subjects.find(s=>s.id===id);}
function orderedSubjects(){return [...SUBJECTS].sort((a,b)=>schedule(a.id).time.localeCompare(schedule(b.id).time));}
function pretty(date,options={weekday:'long',month:'long',day:'numeric'}){return parseDate(date).toLocaleDateString(undefined,options);}
function timeLabel(t){return new Date(`2000-01-01T${t}:00`).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});}
function topbar(title,eyebrow,actions=''){return `<header class="topbar"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1></div><div class="top-actions"><span class="saved">Saved on this device</span>${actions || `<button class="btn" data-action="reminders">${icon('bell')} Reminders</button>`}</div></header>`;}
function navigate(next){view=views.some(v=>v[0]===next)?next:'today';history.replaceState(null,'',`#${view}`);render();window.scrollTo({top:0,behavior:'instant'});}
function render(){
  $('#nav').innerHTML=views.map(([id,ico,label])=>`<button data-view="${id}" class="${view===id?'active':''}" ${view===id?'aria-current="page"':''}>${icon(ico)}${label}</button>`).join('');
  $('#profile-name').textContent=state.settings.name;$('#avatar').textContent=state.settings.name.charAt(0).toUpperCase();
  $('#app').innerHTML=({today:renderToday,week:renderWeek,log:renderLog,creatures:renderCreatures,settings:renderSettings})[view]();
  tickTimer(false);
}
function nextSubject(){return orderedSubjects().find(s=>!entry(state,selectedDate,s.id).completedAt);}
function renderToday(){
  const school=isSchoolDay(state,selectedDate),count=completedCount(state,selectedDate),future=selectedDate>dateKey(),next=nextSubject();
  const isToday=selectedDate===dateKey();
  let heroTitle='A little focus.<br><em>A little magic.</em>',heroText=`Welcome to your grove, ${esc(state.settings.name)}. Four small quests. A world of possibilities.`,heroAction=`<button class="btn primary" data-action="focus" data-id="${next?.id || 'algebra'}">${icon('stars')} Begin ${next?.name || 'a focus session'} <span aria-hidden="true">→</span></button>`;
  if(!school){heroTitle='Room to wander.<br><em>Time to wonder.</em>';heroText='A little space to rest, read for fun, and notice the world around you.';heroAction='<button class="btn primary" data-view="week">Peek at your week <span aria-hidden="true">→</span></button>';}
  else if(count===4){heroTitle='Look at you grow.<br><em>Your quests are done.</em>';heroText='Every little effort matters. Take a breath and enjoy the rest of your day.';heroAction='<button class="btn primary" data-view="creatures">Visit your creature den <span aria-hidden="true">→</span></button>';}
  else if(!isToday){heroTitle=future?'Make a little plan.<br><em>Leave room for magic.</em>':'Every step counts.<br><em>Keep your story.</em>';heroText=future?'Add your assignments now, then come back on the day to do the work.':'Review your assignments and record any work you finished on this date.';heroAction='<button class="btn primary" data-action="go-today">Back to today <span aria-hidden="true">→</span></button>';}
  return `${topbar(isToday?'Your learning grove':pretty(selectedDate),`${school?'SCHOOL DAY':'REST DAY'} · ${esc(pretty(selectedDate))}`)}
    <section class="hero" aria-label="Welcome to the grove"><div class="hero-copy"><div class="eyebrow">✧ &nbsp; YOUR NEXT LITTLE ADVENTURE</div><h2>${heroTitle}</h2><p>${heroText}</p>${heroAction}</div><img src="./grove.svg" alt="Ember, a curled-up green dragon, resting among spotted mushrooms, a snail, and a moon moth."><span class="hero-caption">THE GROVE GROWS WITH YOU</span></section>
    <div class="trail"><div class="trail-title"><strong>${isToday?"Today's":'Your'} trail</strong><small>${school?'One little quest at a time.':'Rest is part of growing.'}</small></div><div class="segments" role="progressbar" aria-label="Completed subjects" aria-valuemin="0" aria-valuemax="4" aria-valuenow="${count}">${[0,1,2,3].map(i=>`<span class="segment ${i<count?'filled':''}"></span>`).join('')}</div><span class="trail-number">${school?`${count} of 4 complete`:'A day to recharge'}</span></div>
    <div class="dashboard"><section><div class="section-top"><h2>${isToday?"Today's quests":'Daily quests'}</h2><div class="date-nav"><button class="icon-btn" data-action="date-prev" aria-label="Previous day">‹</button><input aria-label="School date" type="date" id="selected-date" value="${selectedDate}"><button class="icon-btn" data-action="date-next" aria-label="Next day">›</button></div></div>
    ${school||count?`<div class="quest-list">${orderedSubjects().map(s=>renderQuest(s,future,isToday,school)).join('')}</div>`:`<div class="empty">${icon('leaf')}<h2>No school quests today.</h2><p>Your schedule leaves this day open. Your dragon will be right here when you return.</p><button class="btn" data-view="week">View your school week</button></div>`}</section>
    <aside class="dashboard-aside">${renderFocus()}${renderCompanion()}</aside></div>`;
}
function renderQuest(s,future,isToday,school){
  const e=entry(state,selectedDate,s.id),plan=schedule(s.id),done=!!e.completedAt;
  if(!school&&!done)return '';
  return `<article class="quest-card ${done?'done':''}" data-card="${s.id}"><div class="subject-icon ${s.color}">${icon(s.icon)}</div><div class="quest-main"><div class="quest-title"><h3>${s.name}</h3><span class="time-label">${timeLabel(plan.time)} · ${plan.minutes} min</span></div><p class="assignment ${e.assignment?'':'placeholder'}">${esc(e.assignment || s.subtitle)}</p><div class="quest-actions"><div class="quest-links"><button class="text-btn" data-action="edit" data-id="${s.id}" data-date="${selectedDate}">${e.assignment?'Edit assignment':'Add assignment'}</button>${e.link?`<a class="text-btn" href="${esc(safeURL(e.link))}" target="_blank" rel="noopener noreferrer">Open lesson ↗</a>`:''}${isToday&&!done?`<button class="text-btn" data-action="focus" data-id="${s.id}">${icon('clock')} Focus</button>`:''}</div><button class="check-btn ${done?'checked':''}" data-action="complete" data-id="${s.id}" data-date="${selectedDate}" ${future?'disabled title="Check this off on the school date or later"':''} aria-label="${done?'Undo completion for':'Mark complete:'} ${s.name}">${icon('check')}${done?'Done · +10 XP':future?'Planned':'Mark done'}</button></div></div></article>`;
}
function renderFocus(){
 const t=state.timer,active=!!t,id=t?.id||focusId;
 return `<section class="panel focus-panel" aria-label="Focus timer"><div class="panel-label">${icon('clock')} A MOMENT OF FOCUS</div><h3>${active?'Just this one thing.':'Settle into a quest.'}</h3><select id="focus-subject" aria-label="Focus subject" ${active?'disabled':''}>${SUBJECTS.map(s=>`<option value="${s.id}" ${s.id===id?'selected':''}>${s.name}</option>`).join('')}</select><div class="timer-display" id="timer-display" role="timer" aria-label="Focus time remaining">${String(focusMinutes).padStart(2,'0')}:00</div>${!active?`<select id="focus-length" aria-label="Focus session length">${[15,25,40].map(n=>`<option value="${n}" ${n===focusMinutes?'selected':''}>${n} minute focus</option>`).join('')}</select>`:`<small>${pretty(t.date,{month:'short',day:'numeric'})} · ${t.endsAt?'Focus in progress':'Paused'}</small>`}<button class="btn primary" data-action="timer-toggle">${active?(t.endsAt?'Pause':'Resume'):'Start focusing'}</button>${active?'<div class="timer-actions"><button class="text-btn" data-action="timer-stop">End session</button></div>':''}<p class="focus-hint">One thing at a time is enough.<br>Check off your work when you finish.</p></section>`;
}
function renderCompanion(){
 const xp=totalXP(state),level=Math.floor(xp/100)+1,progress=xp%100,next=CREATURES.find(c=>c.at>xp);
 return `<section class="panel"><div class="panel-label">YOUR FOREST COMPANION</div><div class="companion-head"><span class="subject-icon">${icon('dragon')}</span><div><h3>Ember</h3><small>Level ${level} · ${level<3?'Little spark':level<6?'Grove explorer':'Forest guardian'}</small></div></div><div class="xp-track"><span style="width:${progress}%"></span></div><div class="xp-label"><span>${xp} XP gathered</span><span>${100-progress} to level ${level+1}</span></div><div class="next-creature">${icon(next?.icon||'stars')}<div><strong>${next?`Next friend: ${next.name}`:'A full, happy grove'}</strong><small>${next?`${next.at-xp} more XP to meet them`:'All your woodland friends are here.'}</small></div></div><button class="text-btn" data-view="creatures">Visit the creature den <span aria-hidden="true">→</span></button></section>`;
}
function renderWeek(){
 const days=Array.from({length:7},(_,i)=>shiftDate(selectedWeek,i)),schoolDays=days.filter(d=>isSchoolDay(state,d));
 return `${topbar('A week in the woods','YOUR SCHOOL RHYTHM',`<button class="btn" data-action="calendar">${icon('calendar')} Calendar alerts</button>`)}<p class="page-intro">A little structure, plenty of breathing room. Open a day to plan assignments or record your work.</p><div class="week-navigation"><h2>${pretty(selectedWeek,{month:'short',day:'numeric'})} – ${pretty(days[6],{month:'short',day:'numeric',year:'numeric'})}</h2><div class="date-nav"><button class="icon-btn" data-action="week-prev" aria-label="Previous week">‹</button><button class="btn" data-action="week-current">This week</button><button class="icon-btn" data-action="week-next" aria-label="Next week">›</button></div></div><div class="week-strip">${days.map(d=>`<button class="week-day ${isSchoolDay(state,d)?'':'rest'} ${d===dateKey()?'today':''}" data-action="open-day" data-date="${d}" aria-label="Open ${pretty(d)}"><span>${pretty(d,{weekday:'short'})}</span><strong>${parseDate(d).getDate()}</strong><small>${isSchoolDay(state,d)?`${completedCount(state,d)} / 4 done`:'Rest day'}</small></button>`).join('')}</div><div class="week-grid">${schoolDays.map(date=>`<section class="week-card"><div class="week-heading"><h3>${pretty(date,{weekday:'long'})} <small>· ${parseDate(date).getDate()}</small></h3><button class="text-btn" data-action="open-day" data-date="${date}">Open day →</button></div>${orderedSubjects().map(s=>{const e=entry(state,date,s.id);return `<div class="week-row">${icon(e.completedAt?'check':s.icon)}<div><strong>${s.name} <small>· ${timeLabel(schedule(s.id).time)}</small></strong><p>${esc(e.assignment||'No assignment added yet.')}</p></div><button class="text-btn" data-action="edit" data-id="${s.id}" data-date="${date}" aria-label="Edit ${s.name} for ${pretty(date)}">${e.assignment?'Edit':'Plan'} ↗</button></div>`;}).join('')}</section>`).join('')}</div>`;
}
function renderLog(){
 const records=Object.entries(state.entries).filter(([key,e])=>e.completedAt&&(logFilter==='all'||key.split('|')[1]===logFilter)).sort(([a],[b])=>b.localeCompare(a));
 const all=Object.entries(state.entries).filter(([,e])=>e.completedAt),dayCount=new Set(all.map(([k])=>k.split('|')[0])).size,groups=Object.groupBy?Object.groupBy(records,([k])=>k.split('|')[0]):records.reduce((a,r)=>{(a[r[0].split('|')[0]]??=[]).push(r);return a;},{});
 return `${topbar('Your field notes','THE LITTLE THINGS ADD UP',`<button class="btn" data-action="export-csv">${icon('download')} Export record</button>`)}<p class="page-intro">A record of the work you have done and the things you have noticed. Completed lessons appear here automatically.</p><div class="stats"><div class="stat"><strong>${all.length}</strong><span>Quests completed</span></div><div class="stat"><strong>${dayCount}</strong><span>Days with work recorded</span></div><div class="stat"><strong>${totalXP(state)}</strong><span>XP gathered</span></div></div><div class="log-filters"><label for="log-filter" class="muted">Show</label><select id="log-filter">${[{id:'all',name:'All subjects'},...SUBJECTS].map(s=>`<option value="${s.id}" ${s.id===logFilter?'selected':''}>${s.name}</option>`).join('')}</select><button class="text-btn" data-action="print">Print this view</button></div>${records.length?Object.entries(groups).map(([date,rows])=>`<section class="log-group"><h3>${pretty(date,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</h3>${rows.map(([key,e])=>{const s=SUBJECTS.find(s=>s.id===key.split('|')[1]);return `<article class="log-entry"><div class="subject-icon ${s.color}">${icon(s.icon)}</div><div><h3>${s.name}</h3><p>${esc(e.assignment || 'Lesson completed')}</p>${e.note?`<p class="log-note">${esc(e.note)}</p>`:''}<small>✓ Completed · +10 XP${e.minutes?` · ${e.minutes} planned minutes`:''}</small></div><button class="text-btn" data-action="edit" data-id="${s.id}" data-date="${date}">Edit notes</button></article>`;}).join('')}</section>`).join(''):`<div class="empty">${icon('quill')}<h2>Your story starts here.</h2><p>Finish a lesson and mark it done. You can add a note about what you learned, what was tricky, or what made you curious.</p><button class="btn" data-view="today">Back to your quests</button></div>`}`;
}
function renderCreatures(){
 const xp=totalXP(state);
 return `${topbar('The creature den','GOOD COMPANY FOR THE JOURNEY')}<p class="page-intro">Every completed subject gives Ember 10 XP. Meet new friends as you go. Take days off whenever you need them; your progress stays with you.</p><div class="settings-note">${icon('stars')} &nbsp; <strong>${xp} XP</strong> gathered · Ember is level ${Math.floor(xp/100)+1} · ${CREATURES.filter(c=>c.at<=xp).length} of ${CREATURES.length} friends discovered</div><div class="creature-grid">${CREATURES.map(c=>`<article class="creature-card ${xp<c.at?'locked':''}"><div class="creature-portrait">${icon(c.icon)}</div><h3>${c.name}</h3><small>${c.kind}</small><p>${c.description}</p><span class="pill">${xp>=c.at?'✧ Discovered':`${c.at-xp} XP to discover`}</span></article>`).join('')}</div><p class="page-intro">Rewards celebrate showing up. No streaks to lose, and no points are taken away for rest days. Undoing a completed lesson also removes its 10 XP.</p>`;
}
function notificationStatus(){if(!('Notification' in window))return 'This browser does not support desktop alerts. In-app reminders and calendar downloads are available.';return Notification.permission==='granted'?'Browser permission is enabled. Alerts still need this app open and the device awake.':Notification.permission==='denied'?'Browser alerts are blocked. You can change permission in your browser’s site settings.':'Desktop alerts are optional. Your browser will ask before allowing them.';}
function renderSettings(){
 return `${topbar('Tend your grove','MAKE IT YOUR OWN')}<p class="page-intro">The starting times below are suggestions. Change them to match your school day. All four subjects appear on every selected school day.</p><div class="settings-grid"><section class="panel"><h2>Your school rhythm</h2><form id="schedule-form"><label class="field">Name<input name="name" value="${esc(state.settings.name)}" maxlength="40" required></label><label class="field">School days</label><div class="days">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=>`<label class="day-check"><input type="checkbox" name="days" value="${i}" ${state.settings.days.includes(i)?'checked':''}><span>${d}</span></label>`).join('')}</div>${SUBJECTS.map(s=>{const p=schedule(s.id);return `<div class="schedule-row"><span>${s.name}</span><label>Start time<input type="time" name="${s.id}-time" value="${p.time}" required aria-label="${s.name} start time"></label><label>Minutes<input type="number" name="${s.id}-minutes" value="${p.minutes}" min="5" max="180" step="5" required aria-label="${s.name} planned minutes"></label></div>`;}).join('')}<p class="settings-note">Times follow this device’s local clock (${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}). Schedule edits update the planner; completed records stay saved. Use past dates to review or record earlier work.</p><p class="error" id="schedule-error" role="alert"></p><button class="btn primary" type="submit">Save school schedule</button></form></section><div><section class="panel"><h2>Gentle reminders</h2><label class="toggle-label"><input type="checkbox" id="reminders-enabled" ${state.settings.reminders?'checked':''}><span>Remind me when a subject starts<small>An in-app nudge at the scheduled time on school days. Already completed subjects are skipped.</small></span></label><label class="toggle-label"><input type="checkbox" id="sound-enabled" ${state.settings.sound?'checked':''}><span>Play a quiet chime<small>For lesson reminders and the end of a focus session. Sound may require a tap in the app first.</small></span></label><p class="settings-note">Keep the app open and your device awake for these reminders. They cannot wake a sleeping device or arrive after you close the app. For alerts with the app closed, add the school schedule to your calendar.</p><p id="notification-status">${notificationStatus()}</p><div class="button-row"><button class="btn" data-action="enable-notifications">${icon('bell')} Enable desktop alerts</button><button class="text-btn" data-action="test-reminder">Try a reminder</button></div><div class="button-row"><button class="btn" data-action="calendar">${icon('calendar')} Download calendar alerts</button></div></section><section class="panel" style="margin-top:22px"><h2>Keep your progress</h2><p>Your assignments and notes are saved in this browser on this device. There is no account or automatic sync. Make a backup before clearing browser data, changing devices, or moving to a different site address.</p><div class="button-row"><button class="btn" data-action="backup">${icon('download')} Save backup</button><button class="btn" data-action="import">Restore backup</button><button class="text-btn" data-action="export-csv">Download completion record (.csv)</button></div><hr class="divider"><p><strong>Use it like an app.</strong> After opening the live site, use your browser’s install option or Add to Home Screen if available. Your grove works offline after its first successful load.</p></section></div></div>`;
}

function openDialog(content){$('#dialog-content').innerHTML=`<button class="dialog-close" data-action="close-dialog" aria-label="Close dialog">×</button>${content}`;if(!$('#dialog').open)$('#dialog').showModal();}
function editAssignment(id,date){
 const subject=SUBJECTS.find(s=>s.id===id);if(!subject)return;const e=entry(state,date,id);
 openDialog(`<div class="eyebrow">${subject.name} · ${pretty(date,{month:'short',day:'numeric'})}</div><h2 id="dialog-title">A little plan for ${subject.name}.</h2><p>Add a lesson, a chapter, or one small goal. Field notes are optional.</p><form id="assignment-form" data-id="${id}" data-date="${date}"><label class="field">Assignment<textarea name="assignment" maxlength="2000" placeholder="What are you working on?">${esc(e.assignment)}</textarea></label><label class="field">Lesson link <small>Optional · paste a full https:// address</small><input name="link" type="url" value="${esc(e.link)}" maxlength="2000" placeholder="https://..."></label><label class="field">Field notes<textarea name="note" maxlength="4000" placeholder="What did you learn, make, or wonder about?">${esc(e.note)}</textarea></label><p id="assignment-error" class="error" role="alert"></p><div class="dialog-footer">${e.completedAt?`<button type="button" class="btn" data-action="complete" data-id="${id}" data-date="${date}">Undo completion</button>`:''}<button type="submit" class="btn primary">Save assignment</button></div></form>`);
}
function complete(id,date){
 if(date>dateKey())return;const s=SUBJECTS.find(s=>s.id===id);if(!s)return;
 const before=totalXP(state);let wasDone=false;
 const ok=change(d=>{const e=entry(d,date,id);wasDone=!!e.completedAt;d.entries[entryKey(date,id)]={...e,completedAt:wasDone?null:new Date().toISOString(),minutes:wasDone?e.minutes:d.settings.subjects.find(x=>x.id===id).minutes};});
 if(!ok)return;
 if($('#dialog').open)$('#dialog').close();render();
 if(wasDone)toast(`${s.name} marked unfinished. You can check it off again anytime.`);
 else {const friend=CREATURES.find(c=>c.at>before&&c.at<=totalXP(state));toast(friend?`+10 XP · You met ${friend.name}! Visit the creature den.`:`${s.name} complete. +10 XP for Ember!`);document.querySelector(`[data-card="${id}"]`)?.classList.add('celebrate');}
}
function focusOn(id){
 if(state.timer){selectedDate=dateKey();view='today';render();toast('A focus session is already open. Finish or end it before starting another.');return;}
 focusId=id;selectedDate=dateKey();view='today';render();$('.focus-panel')?.scrollIntoView({behavior:'smooth',block:'center'});$('#focus-subject')?.focus();
}
function timerToggle(){
 const t=state.timer;
 if(!t){
  const id=$('#focus-subject')?.value||focusId,mins=Number($('#focus-length')?.value||focusMinutes);
  if(!change(d=>{d.timer={id,date:dateKey(),remaining:mins*60,endsAt:Date.now()+mins*60000};}))return;
 }else if(!change(d=>{if(d.timer){if(d.timer.endsAt){d.timer.remaining=Math.max(0,Math.ceil((d.timer.endsAt-Date.now())/1000));d.timer.endsAt=null;}else{d.timer.endsAt=Date.now()+d.timer.remaining*1000;}}}))return;
 primeAudio();render();
}
function tickTimer(finish=true){
 const t=state.timer,display=$('#timer-display');if(!t){if(display)display.textContent=`${String(focusMinutes).padStart(2,'0')}:00`;return;}
 const secs=t.endsAt?Math.max(0,Math.ceil((t.endsAt-Date.now())/1000)):t.remaining;
 if(display)display.textContent=`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(secs%60).padStart(2,'0')}`;
 if(secs===0&&t.endsAt&&finish){
  const latest=(()=>{try{return JSON.parse(localStorage.getItem(KEY));}catch{return null;}})();
  if(latest?.timer?.endsAt!==t.endsAt){if(latest){state=validateState(latest);render();}return;}
  if(!change(d=>{d.timer=null;}))return;
  render();const name=SUBJECTS.find(s=>s.id===t.id).name;showReminder('Your focus time is finished.',`Nice work with ${name}. Take a break, and mark your lesson done if you finished it.`,'focus');
 }
}
let audioContext;
function primeAudio(){if(!state.settings.sound)return;try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audioContext??=new Audio();audioContext.resume().catch(()=>{});}}catch{}}
function chime(){if(!state.settings.sound)return;primeAudio();if(!audioContext)return;try{for(const [i,f] of [523.25,659.25].entries()){const o=audioContext.createOscillator(),g=audioContext.createGain(),at=audioContext.currentTime+i*.2;o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(.055,at+.03);g.gain.exponentialRampToValueAtTime(.001,at+.65);o.connect(g);g.connect(audioContext.destination);o.start(at);o.stop(at+.7);}}catch{}}
async function desktopNotification(title,body,tag){
 if(!('Notification' in window)||Notification.permission!=='granted')return false;
 try{const reg=await swRegistration;if(reg?.active){await reg.showNotification(title,{body,tag,icon:'./icon-192.png',data:{url:location.href.split('#')[0]}});}else{new Notification(title,{body,tag,icon:'./icon-192.png'});}return true;}catch{return false;}
}
function showReminder(title,body,tag){$('#reminder').innerHTML=`<div><strong>${esc(title)}</strong>${esc(body)}</div><button data-action="dismiss-reminder" aria-label="Dismiss reminder">×</button>`;$('#reminder').hidden=false;chime();desktopNotification(title,body,tag);}
function checkReminders(){
 const today=dateKey();if(today!==currentDay){if(selectedDate===currentDay)selectedDate=today;currentDay=today;render();}
 if(!state.settings.reminders||!isSchoolDay(state,today)||loadFailed)return;
 const now=new Date(),minutes=now.getHours()*60+now.getMinutes();
 const due=orderedSubjects().filter(s=>{const p=schedule(s.id),start=minuteOfDay(p.time);return minutes>=start&&minutes<start+p.minutes&&!entry(state,today,s.id).completedAt;}).at(-1);
 if(!due)return;const key=entryKey(today,due.id);if(state.reminderSeen[key])return;
 let shouldShow=false;
 if(change(d=>{if(d.reminderSeen[key]||entry(d,today,due.id).completedAt)return;shouldShow=true;d.reminderSeen[key]=Date.now();for(const k of Object.keys(d.reminderSeen))if(k.split('|')[0]<shiftDate(today,-14))delete d.reminderSeen[k];})&&shouldShow)showReminder(`${due.name} is ready when you are.`,entry(state,today,due.id).assignment||'One small step is a good place to start. Open your quest and make a little progress.',key);
}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function openCalendar(){openDialog(`<div class="eyebrow">REMINDERS BEYOND THE GROVE</div><h2 id="dialog-title">Bring your calendar along.</h2><p>Download recurring events for your school days, with an alert 5 minutes before each subject. Import the file into Apple Calendar, Google Calendar, Outlook, or another calendar app.</p><form id="calendar-form"><label class="field">First school date<input type="date" name="start" value="${dateKey()}" required></label><label class="field">Last school date<input type="date" name="end" value="${shiftDate(dateKey(),252)}" required></label><p class="settings-note">Events use local clock times. Check the calendar’s time zone and alert settings after importing; some calendars ignore imported alerts. Import into a separate “Moss & Ember” calendar so you can remove or replace the schedule easily. Re-download after schedule changes. Completion and holidays do not sync.</p><p id="calendar-error" class="error" role="alert"></p><div class="dialog-footer"><button class="btn primary" type="submit">Download .ics calendar</button></div></form>`);}

document.addEventListener('click',async event=>{
 const el=event.target.closest('button[data-action],button[data-view]');if(!el)return;
 if(el.dataset.view){if(el.dataset.view==='today')selectedDate=dateKey();navigate(el.dataset.view);return;}
 const a=el.dataset.action,id=el.dataset.id,date=el.dataset.date;
 if(a==='edit')editAssignment(id,date);
 else if(a==='complete')complete(id,date);
 else if(a==='close-dialog')$('#dialog').close();
 else if(a==='focus')focusOn(id);
 else if(a==='timer-toggle')timerToggle();
 else if(a==='timer-stop'){if(change(d=>{d.timer=null;})){render();toast('Session ended. Your lesson stays open until you mark it done.');}}
 else if(a==='date-prev'||a==='date-next'){selectedDate=shiftDate(selectedDate,a==='date-prev'?-1:1);render();}
 else if(a==='go-today'){selectedDate=dateKey();navigate('today');}
 else if(a==='open-day'){selectedDate=date;navigate('today');}
 else if(a==='week-prev'||a==='week-next'){selectedWeek=shiftDate(selectedWeek,a==='week-prev'?-7:7);render();}
 else if(a==='week-current'){selectedWeek=monday(dateKey());render();}
 else if(a==='reminders'){navigate('settings');}
 else if(a==='calendar')openCalendar();
 else if(a==='backup')download(`Moss-and-Ember-Backup-${dateKey()}.json`,JSON.stringify(state,null,2),'application/json');
 else if(a==='recover')download('Moss-and-Ember-Recovery.json',rawRecovery,'application/json');
 else if(a==='export-csv')download(`Moss-and-Ember-Completed-Work-${dateKey()}.csv`,csv(state),'text/csv;charset=utf-8');
 else if(a==='print')window.print();
 else if(a==='import'){$('#import-file').value='';$('#import-file').click();}
 else if(a==='dismiss-reminder')$('#reminder').hidden=true;
 else if(a==='test-reminder')showReminder('A little nudge from Ember.','Your reminders look like this. Open a quest and take one small step.','test');
 else if(a==='enable-notifications'){
  if(!('Notification' in window)){toast('Desktop alerts are not available here. Use calendar alerts instead.');return;}
  try{const result=await Notification.requestPermission();if(result==='granted'){toast('Desktop alerts enabled. Keep the app open for scheduled reminders.');await desktopNotification('Ember says hello.','Desktop alerts are ready while your planner is open.','welcome');}else toast('Desktop alerts are off. In-app reminders are still available.');if($('#notification-status'))$('#notification-status').textContent=notificationStatus();}catch{toast('This browser could not enable alerts. Try calendar reminders.');}
 }
 else if(a==='fresh')openDialog('<h2 id="dialog-title">Start a new grove?</h2><p>This replaces the saved data in this browser. Download the original data first if you want to keep it.</p><div class="dialog-footer"><button class="btn" data-action="close-dialog">Keep existing data</button><button class="btn danger" data-action="confirm-fresh">Start new grove</button></div>');
 else if(a==='confirm-fresh'){if(change(d=>Object.assign(d,defaultState()),{replace:true})){$('#dialog').close();render();toast('Your new grove is ready.');}}
});
document.addEventListener('submit',event=>{
 const f=event.target;if(!['assignment-form','schedule-form','calendar-form'].includes(f.id))return;event.preventDefault();const data=new FormData(f);
 if(f.id==='assignment-form'){
  const link=data.get('link').trim();if(link&&!safeURL(link)){$('#assignment-error').textContent='Use a full http:// or https:// lesson link.';return;}
  if(change(d=>{const key=entryKey(f.dataset.date,f.dataset.id);d.entries[key]={...entry(d,f.dataset.date,f.dataset.id),assignment:data.get('assignment').trim(),note:data.get('note').trim(),link:safeURL(link)};})){$('#dialog').close();render();toast('Your assignment and notes are saved.');}
 }else if(f.id==='schedule-form'){
  const days=data.getAll('days').map(Number),name=data.get('name').trim();if(!days.length||!name){$('#schedule-error').textContent='Enter a name and choose at least one school day.';return;}
  const subjects=SUBJECTS.map(s=>({id:s.id,time:data.get(`${s.id}-time`),minutes:Number(data.get(`${s.id}-minutes`))})),ordered=[...subjects].sort((a,b)=>a.time.localeCompare(b.time));
  for(let i=0;i<ordered.length;i++){const s=ordered[i];if(minuteOfDay(s.time)+s.minutes>1440){$('#schedule-error').textContent='Each subject needs to finish before midnight.';return;}if(i&&minuteOfDay(ordered[i-1].time)+ordered[i-1].minutes>minuteOfDay(s.time)){$('#schedule-error').textContent='These subjects overlap. Leave enough time for each one before the next begins.';return;}}
  if(change(d=>{d.settings={...d.settings,name,days,subjects};d.reminderSeen={};})){render();toast('School schedule saved. Re-download calendar alerts if you use them.');}
 }else{
  try{const content=calendar(state,data.get('start'),data.get('end'),location.href.split('#')[0]);download('Moss-and-Ember-School-Schedule.ics',content,'text/calendar;charset=utf-8');$('#dialog').close();toast('Calendar downloaded. Import it and check that its alerts are enabled.');}catch(e){$('#calendar-error').textContent=e.message;}
 }
});
let pendingImport=null;
document.addEventListener('change',async event=>{
 const el=event.target;
 if(el.id==='selected-date'&&el.value){selectedDate=el.value;render();}
 else if(el.id==='focus-subject')focusId=el.value;
 else if(el.id==='focus-length'){focusMinutes=Number(el.value);tickTimer(false);}
 else if(el.id==='log-filter'){logFilter=el.value;render();}
 else if(el.id==='reminders-enabled'||el.id==='sound-enabled'){
  const setting=el.id==='reminders-enabled'?'reminders':'sound';if(change(d=>{d.settings[setting]=el.checked;})){if(setting==='sound'&&el.checked){primeAudio();chime();}toast(el.checked?'Enabled.':'Turned off.');}else el.checked=state.settings[setting];
 }else if(el.id==='import-file'){
  const file=el.files?.[0];if(!file)return;
  try{if(file.size>8*1024*1024)throw new Error('Choose a backup smaller than 8 MB.');pendingImport=validateState(JSON.parse(await file.text()));const n=Object.values(pendingImport.entries).filter(e=>e.completedAt).length;openDialog(`<h2 id="dialog-title">Restore this grove?</h2><p>This backup belongs to <strong>${esc(pendingImport.settings.name)}</strong> and contains <strong>${n} completed lessons</strong>. Restoring replaces the assignments, settings, and progress currently saved in this browser.</p><p>Download your current backup first if you want to keep both.</p><div class="dialog-footer"><button class="btn" data-action="backup">Save current backup</button><button class="btn primary" id="confirm-import">Replace with backup</button></div>`);$('#confirm-import').addEventListener('click',()=>{if(change(d=>Object.assign(d,pendingImport),{replace:true})){pendingImport=null;$('#dialog').close();render();toast('Backup restored. Your grove is here.');}});}
  catch(e){pendingImport=null;toast(e.message || 'This backup could not be read.');}
 }
});
window.addEventListener('storage',event=>{if(event.key!==KEY)return;try{state=event.newValue?validateState(JSON.parse(event.newValue)):defaultState();if($('#dialog').open)$('#dialog').close();render();toast('Your grove updated from another tab.');}catch{storageError('Another tab saved data this app could not read. Refresh before making changes.');loadFailed=true;}});
window.addEventListener('hashchange',()=>{view=views.some(v=>v[0]===location.hash.slice(1))?location.hash.slice(1):'today';if(view==='today')selectedDate=dateKey();render();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){tickTimer();checkReminders();}});
view=views.some(v=>v[0]===location.hash.slice(1))?location.hash.slice(1):'today';render();
setInterval(()=>tickTimer(),1000);setInterval(checkReminders,20000);setTimeout(checkReminders,1200);
