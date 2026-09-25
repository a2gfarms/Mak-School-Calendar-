export const KEY = 'moss-and-ember.v1';
export const SUBJECTS = [
  { id: 'algebra', name: 'Algebra', subtitle: 'One problem at a time', icon: 'stars', color: 'lavender', time: '09:00', minutes: 40 },
  { id: 'writing', name: 'Writing', subtitle: 'Make something only you can', icon: 'quill', color: 'peach', time: '09:50', minutes: 30 },
  { id: 'biology', name: 'Biology', subtitle: 'There is a whole world to discover', icon: 'leaf', color: 'green', time: '10:30', minutes: 40 },
  { id: 'literature', name: 'Literature', subtitle: 'Step into another world', icon: 'book', color: 'blue', time: '11:20', minutes: 30 },
];
export const CREATURES = [
  { name: 'Ember', kind: 'Your woodland dragon', at: 0, icon: 'dragon', description: 'A quiet companion for every chapter. Ember is here from your very first day.' },
  { name: 'Button', kind: 'The mushroom snail', at: 40, icon: 'snail', description: 'Unhurried, curious, and always carrying a little garden.' },
  { name: 'Velvet', kind: 'The moon moth', at: 120, icon: 'moth', description: 'Finds the light in even the trickiest lesson.' },
  { name: 'Pip', kind: 'The jumping spider', at: 240, icon: 'spider', description: 'Small steps. Surprisingly big leaps.' },
  { name: 'Fern', kind: 'The leaf beetle', at: 400, icon: 'beetle', description: 'A tiny explorer with a shiny, leaf-green coat.' },
  { name: 'Morel', kind: 'The mushroom keeper', at: 600, icon: 'mushroom', description: 'Tends the grove while you grow your own ideas.' },
];
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function parseDate(key) { return new Date(`${key}T12:00:00`); }
export function shiftDate(key, n) { const d = parseDate(key); d.setDate(d.getDate()+n); return dateKey(d); }
export function monday(key) { const d = parseDate(key).getDay(); return shiftDate(key, -(d === 0 ? 6 : d-1)); }
export function validDate(key) { return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(+parseDate(key)) && dateKey(parseDate(key)) === key; }
export function validTime(t) { return typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t); }
export function minuteOfDay(t) { return Number(t.slice(0,2))*60+Number(t.slice(3)); }
export function defaultState() {
  return { version: 1, settings: { name: 'Makaylah', days: [1,2,3,5], reminders: true, sound: false, subjects: SUBJECTS.map(({id,time,minutes}) => ({id,time,minutes})) }, entries: {}, reminderSeen: {}, timer: null };
}
export function isSchoolDay(state, date) { return state.settings.days.includes(parseDate(date).getDay()); }
export function entryKey(date, id) { return `${date}|${id}`; }
export function entry(state, date, id) { return state.entries[entryKey(date,id)] || { assignment: '', note: '', link: '', completedAt: null }; }
export function totalXP(state) { return Object.values(state.entries).filter(e => e.completedAt).length * 10; }
export function completedCount(state, date) { return SUBJECTS.filter(s => entry(state,date,s.id).completedAt).length; }
export function safeURL(value) { try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }
export function validateState(raw) {
  if (!raw || raw.version !== 1 || !raw.settings || !raw.entries || typeof raw.entries !== 'object' || Array.isArray(raw.entries)) throw new Error('This is not a Moss & Ember backup.');
  const s = raw.settings;
  if (typeof s.name !== 'string' || !s.name.trim() || s.name.length>40 || !Array.isArray(s.days) || !s.days.length || s.days.length>7 || !s.days.every(d => Number.isInteger(d) && d>=0 && d<=6) || new Set(s.days).size !== s.days.length) throw new Error('The backup has invalid settings.');
  if (!Array.isArray(s.subjects) || s.subjects.length!==4 || !SUBJECTS.every(x => s.subjects.filter(y => y.id===x.id && validTime(y.time) && Number.isInteger(y.minutes) && y.minutes>=5 && y.minutes<=180).length===1)) throw new Error('The backup has an invalid schedule.');
  const clean = defaultState();
  clean.settings = { name:s.name.trim(), days:[...s.days], reminders:s.reminders===true, sound:s.sound===true, subjects:s.subjects.map(({id,time,minutes}) => ({id,time,minutes})) };
  const entries = Object.entries(raw.entries);
  if (entries.length>50000) throw new Error('This backup is too large.');
  for (const [key,e] of entries) {
    const [date,id,...extra] = key.split('|');
    if (extra.length || !validDate(date) || !SUBJECTS.some(s=>s.id===id) || !e || typeof e !== 'object') throw new Error('The backup contains an invalid lesson.');
    if (e.completedAt != null && (typeof e.completedAt !== 'string' || Number.isNaN(Date.parse(e.completedAt)))) throw new Error('The backup contains an invalid completion date.');
    for (const k of ['assignment','note','link']) if (e[k] != null && (typeof e[k] !== 'string' || e[k].length > 6000)) throw new Error('The backup contains invalid lesson text.');
    clean.entries[key] = { assignment:e.assignment || '', note:e.note || '', link:safeURL(e.link || ''), completedAt:e.completedAt || null, minutes: Number.isFinite(e.minutes) ? Math.min(180,Math.max(0,e.minutes)) : 0 };
  }
  if (raw.reminderSeen && typeof raw.reminderSeen === 'object') for (const [k,v] of Object.entries(raw.reminderSeen).slice(-200)) if (typeof v==='number' && Number.isFinite(v)) clean.reminderSeen[k] = v;
  const t = raw.timer;
  if (t && SUBJECTS.some(s=>s.id===t.id) && validDate(t.date) && Number.isFinite(t.remaining) && t.remaining>=0 && t.remaining<=10800 && (t.endsAt===null || Number.isFinite(t.endsAt))) clean.timer={id:t.id,date:t.date,remaining:t.remaining,endsAt:t.endsAt};
  return clean;
}
export function csv(state) {
  const cell = value => { let s = String(value ?? ''); if (/^[=+@\-\t\r]/.test(s)) s="'"+s; return '"'+s.replaceAll('"','""')+'"'; };
  const rows = [['School date','Subject','Assignment','Field notes','Planned minutes','Completed at (ISO timestamp)']];
  for (const [key,e] of Object.entries(state.entries).sort(([a],[b])=>a.localeCompare(b))) if (e.completedAt) {
    const [date,id] = key.split('|'); rows.push([date,SUBJECTS.find(s=>s.id===id).name,e.assignment,e.note,e.minutes,e.completedAt]);
  }
  return '\uFEFF'+rows.map(row=>row.map(cell).join(',')).join('\r\n');
}
export function calendar(state, start, end, appURL='') {
  if (!validDate(start)||!validDate(end)||end<start) throw new Error('Choose an end date on or after the start date.');
  const esc = s => s.replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(',','\\,').replaceAll(';','\\;');
  const weekdays=['SU','MO','TU','WE','TH','FR','SA'];
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Moss and Ember//Homeschool Planner//EN','CALSCALE:GREGORIAN','X-WR-CALNAME:Moss & Ember School'];
  let first = start; while (!isSchoolDay(state,first)) first=shiftDate(first,1);
  if (first>end) throw new Error('There are no school days in this date range.');
  const stamp = new Date().toISOString().replaceAll('-','').replaceAll(':','').split('.')[0]+'Z';
  const url=safeURL(appURL);
  for (const s of state.settings.subjects) {
    const subject=SUBJECTS.find(x=>x.id===s.id), d=new Date(`${first}T${s.time}:00`); d.setMinutes(d.getMinutes()+s.minutes);
    const localEnd=dateKey(d).replaceAll('-','')+'T'+String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0')+'00';
    lines.push('BEGIN:VEVENT',`UID:moss-ember-${s.id}-${start}@moss-ember.local`,`DTSTAMP:${stamp}`,`DTSTART:${first.replaceAll('-','')}T${s.time.replace(':','')}00`,`DTEND:${localEnd}`,`RRULE:FREQ=WEEKLY;BYDAY=${state.settings.days.map(d=>weekdays[d]).join(',')};UNTIL=${end.replaceAll('-','')}T235959`,`SUMMARY:${esc(subject.name+' · Moss & Ember')}`,`DESCRIPTION:${esc('A little focus. A little magic. Open Moss & Ember to see your assignment and record your work.'+(url?' '+url:'')+' This calendar does not sync completion or schedule edits.')}`,...(url?[`URL:${url}`]:[]),'BEGIN:VALARM','TRIGGER:-PT5M','ACTION:DISPLAY',`DESCRIPTION:${subject.name} starts in 5 minutes`,'END:VALARM','END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  // RFC 5545 folds physical lines at 75 UTF-8 octets.
  return lines.map(line=>{let out='',part='',bytes=0;for(const c of line){const n=new TextEncoder().encode(c).length;if(bytes+n>75){out+=part+'\r\n';part=' ';bytes=1;}part+=c;bytes+=n;}return out+part;}).join('\r\n')+'\r\n';
}
