import{c as r,n as d,l as u,aU as p,j as e,aV as c,aW as a,a4 as h,v as n,h as k,aX as b}from"./index-jOU-_MXC.js";import{P as x,C as i}from"./blocks-DwW4e0HV.js";import{R as y}from"./rotate-ccw-BuwPqWk-.js";import{I as g}from"./info-DmkCr_kF.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=r("BellRing",[["path",{d:"M10.268 21a2 2 0 0 0 3.464 0",key:"vwvbt9"}],["path",{d:"M22 8c0-2.3-.8-4.3-2-6",key:"5bb3ad"}],["path",{d:"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326",key:"11g9vi"}],["path",{d:"M4 2C2.8 3.7 2 5.7 2 8",key:"tap9e0"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=r("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=r("Palette",[["circle",{cx:"13.5",cy:"6.5",r:".5",fill:"currentColor",key:"1okk4w"}],["circle",{cx:"17.5",cy:"10.5",r:".5",fill:"currentColor",key:"f64h9f"}],["circle",{cx:"8.5",cy:"7.5",r:".5",fill:"currentColor",key:"fotxhn"}],["circle",{cx:"6.5",cy:"12.5",r:".5",fill:"currentColor",key:"qy21gx"}],["path",{d:"M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",key:"12rzf8"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=r("Wrench",[["path",{d:"M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",key:"cbrjhi"}]]),w={system:"System",light:"Light",dark:"Dark"};function D(){const s=d(),o=u(),l=p();return!s||!o?null:e.jsxs(x,{title:"Settings",children:[e.jsxs(c,{title:"Your trackers",children:[s.active.map(t=>e.jsx(a,{leading:e.jsx(i,{concern:t.tracker.concern,size:40}),label:t.tracker.productName,sub:`${t.name} · ${t.status.title}`,to:`/settings/tracker/${t.tracker.id}`},t.tracker.id)),s.active.length<3?e.jsx(a,{icon:h,label:"New tracker",sub:"Follow another product, up to 3 at once",to:"/new"}):null,s.closed.map(t=>e.jsx(a,{leading:e.jsx(i,{concern:t.tracker.concern,size:40}),label:t.tracker.productName,sub:`Closed ${n(t.tracker.closedDate,{year:!0})} · history kept`,to:`/settings/tracker/${t.tracker.id}`},t.tracker.id))]}),s.active.length||s.closed.length?e.jsxs("p",{className:"-mt-4 mb-6 px-1 text-[0.85rem] text-ink2",children:[s.active.length," active",s.closed.length?`, ${s.closed.length} closed`:"","."]}):null,e.jsxs(c,{title:"App",children:[e.jsx(a,{icon:j,label:"Appearance",sub:"Theme, text size, motion",value:w[o.theme],to:"/settings/appearance",tone:"lav"}),e.jsx(a,{icon:m,label:"Reminders",sub:"Calendar, check-in interval, backups",to:"/settings/reminders",tone:"sand"}),e.jsx(a,{icon:k,label:"Privacy",sub:"App lock, blur photo previews",value:o.lockHash?"Locked":void 0,to:"/settings/privacy",tone:"mint"}),e.jsx(a,{icon:v,label:"Data",sub:"Storage, backup, delete everything",to:"/settings/data",tone:"blue"}),e.jsx(a,{icon:f,label:"Advanced",sub:l?`Date set to ${n(l,{short:!0,year:!0})}`:"Change today's date",to:"/settings/advanced",tone:"grey"})]}),e.jsxs(c,{title:"Help",children:[e.jsx(a,{icon:b,label:"Guide and questions",sub:"Photo tips, how results work, sources",to:"/guide"}),e.jsx(a,{icon:y,label:"Replay the intro",to:"/welcome/intro?replay=1"}),e.jsx(a,{icon:g,label:"About Same Spot",sub:"Try it in 2 minutes, version, licences",to:"/settings/about"})]})]})}export{D as default};
