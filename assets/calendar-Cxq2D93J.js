import{c as p,al as d,bc as o,w as r,E}from"./index-jOU-_MXC.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=p("CalendarPlus",[["path",{d:"M8 2v4",key:"1cmpym"}],["path",{d:"M16 2v4",key:"4m81vk"}],["path",{d:"M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8",key:"3spt84"}],["path",{d:"M3 10h18",key:"8toen8"}],["path",{d:"M16 19h6",key:"xwg31i"}],["path",{d:"M19 16v6",key:"tddt3s"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=p("Download",[["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}],["polyline",{points:"7 10 12 15 17 10",key:"2ggqvy"}],["line",{x1:"12",x2:"12",y1:"15",y2:"3",key:"1vk2je"}]]),s=()=>`${location.origin}${location.pathname}`;function l(e,t){return t?"Same Spot check-in":`Same Spot check-in: ${E[e.concern].short}`}function S(e,t,n){const a=d(e,t);return`https://calendar.google.com/calendar/render?${new URLSearchParams({action:"TEMPLATE",text:l(e,n),dates:`${o(a)}/${o(r(a,1))}`,details:`About 30 seconds. Open Same Spot on this phone: ${s()}`,recur:`RRULE:FREQ=DAILY;INTERVAL=${e.interval};COUNT=12`}).toString()}`}const c=e=>e.replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");function h(e){const t=[];let n=e;for(;n.length>74;)t.push(n.slice(0,74)),n=` ${n.slice(74)}`;return t.push(n),t.join(`\r
`)}function R(e,t,n){const a=d(e,t),i=new Date().toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");return`${["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Same Spot//Check-ins//EN","CALSCALE:GREGORIAN","METHOD:PUBLISH","BEGIN:VEVENT",`UID:${e.id}-${o(a)}@samespot`,`DTSTAMP:${i}`,`DTSTART;VALUE=DATE:${o(a)}`,`DTEND;VALUE=DATE:${o(r(a,1))}`,`SUMMARY:${c(l(e,n))}`,`DESCRIPTION:${c(`About 30 seconds. Open Same Spot on this phone: ${s()}`)}`,`URL:${s()}`,`RRULE:FREQ=DAILY;INTERVAL=${e.interval};COUNT=12`,"BEGIN:VALARM","ACTION:DISPLAY",`DESCRIPTION:${c(l(e,n))}`,"TRIGGER:PT10H","END:VALARM","END:VEVENT","END:VCALENDAR"].map(h).join(`\r
`)}\r
`}function A(e,t){const n=URL.createObjectURL(e),a=document.createElement("a");a.href=n,a.download=t,document.body.appendChild(a),a.click(),a.remove(),setTimeout(()=>URL.revokeObjectURL(n),5e3)}function T(e,t,n){A(new Blob([R(e,t,n)],{type:"text/calendar;charset=utf-8"}),"same-spot-check-ins.ics")}export{L as C,u as D,A as a,T as d,S as g};
