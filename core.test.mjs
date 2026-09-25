import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultState,entryKey,entry,dateKey,shiftDate,monday,isSchoolDay,totalXP,completedCount,validateState,csv,calendar,safeURL} from '../public/core.mjs';

test('School days exclude Thursday and weekends, with local date navigation across DST',()=>{
 const s=defaultState();assert.equal(isSchoolDay(s,'2026-09-24'),false);assert.equal(isSchoolDay(s,'2026-09-25'),true);assert.equal(isSchoolDay(s,'2026-09-26'),false);
 assert.equal(monday('2026-09-27'),'2026-09-21');assert.equal(shiftDate('2026-12-31',1),'2027-01-01');assert.equal(shiftDate('2026-03-08',1),'2026-03-09');assert.equal(dateKey(new Date(2026,8,25,23,59)),'2026-09-25');
});
test('Completion is one record per date/subject and undo removes only its reward',()=>{
 const s=defaultState(),k=entryKey('2026-09-25','algebra');s.entries[k]={...entry(s,'2026-09-25','algebra'),completedAt:'2026-09-25T15:00:00Z'};
 assert.equal(totalXP(s),10);assert.equal(completedCount(s,'2026-09-25'),1);s.entries[k].note='Learned slopes';assert.equal(totalXP(s),10);
 s.entries[entryKey('2026-09-23','biology')]={completedAt:'2026-09-23T14:00:00Z'};s.entries[k].completedAt=null;assert.equal(totalXP(s),10);assert.equal(completedCount(s,'2026-09-25'),0);
});
test('Backup validation rejects bad data, strips executable URLs, and preserves work',()=>{
 const s=defaultState();s.entries['2026-09-25|algebra']={assignment:'<img onerror=alert(1)>',note:'My notes',link:'javascript:alert(1)',completedAt:'2026-09-25T15:00:00Z',minutes:40};
 const v=validateState(JSON.parse(JSON.stringify(s)));assert.equal(v.entries['2026-09-25|algebra'].note,'My notes');assert.equal(v.entries['2026-09-25|algebra'].link,'');assert.equal(totalXP(v),10);
 assert.throws(()=>validateState({...s,version:2}));assert.throws(()=>validateState({...s,entries:{'2026-02-31|algebra':{}}}));assert.throws(()=>validateState({...s,entries:{'2026-09-25|unknown':{}}}));
 assert.equal(safeURL('https://example.com/lesson'),'https://example.com/lesson');assert.equal(safeURL('data:text/html,test'),'');
});
test('CSV exports only completed work, preserves commas/newlines, and neutralizes formula cells',()=>{
 const s=defaultState();s.entries['2026-09-25|writing']={assignment:'=SUM(A1)',note:'A "quote", then\na new line',completedAt:'2026-09-25T15:00:00Z',minutes:30};s.entries['2026-09-25|biology']={assignment:'Unfinished',completedAt:null};
 const out=csv(s);assert.ok(out.includes("\"'=SUM(A1)\""));assert.ok(out.includes('"A ""quote"", then\na new line"'));assert.ok(!out.includes('Unfinished'));
});
test('Calendar has four local recurring events, school-day recurrence, end date, and alerts',()=>{
 const s=defaultState(),out=calendar(s,'2026-09-26','2027-05-21'),unfold=out.replaceAll('\r\n ','');
 assert.equal((out.match(/BEGIN:VEVENT/g)||[]).length,4);assert.equal((out.match(/BEGIN:VALARM/g)||[]).length,4);assert.ok(out.includes('DTSTART:20260928T090000'));assert.ok(unfold.includes('BYDAY=MO,TU,WE,FR;UNTIL=20270521T235959'));assert.ok(out.includes('TRIGGER:-PT5M'));
 assert.ok(out.split('\r\n').every(line=>Buffer.byteLength(line)<=75));assert.throws(()=>calendar(s,'2026-09-25','2026-09-24'));assert.throws(()=>calendar(s,'2026-09-26','2026-09-27'));
});
