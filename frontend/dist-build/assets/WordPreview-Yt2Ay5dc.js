import{R as A,r as d,j as y,ax as B,ay as F,az as N}from"./index-BLFmaW6t.js";function S(t){try{t.style.setProperty("transform","none","important"),t.style.setProperty("transform-origin","0 0","important"),t.style.setProperty("filter","none","important"),t.style.setProperty("will-change","auto","important")}catch{}}function q(t){try{if(!t)return;const e=t.querySelector('.docx-wrapper, .docx-preview-content-wrapper, [class*="wrapper"]')||t;if(!e)return;e.style.setProperty("direction","ltr","important"),e.style.setProperty("display","flex","important"),e.style.setProperty("flex-direction","column","important"),e.style.setProperty("align-items","center","important"),e.querySelectorAll("p").forEach(i=>{const n=i;n.style.setProperty("direction","rtl","important"),n.style.setProperty("text-align","justify","important"),n.style.setProperty("text-justify","inter-word","important"),n.style.setProperty("text-align-last","right","important"),n.style.setProperty("unicode-bidi","embed","important")})}catch{}}function P(t){try{if(!t)return;const e=t.querySelector('.docx-wrapper, .docx-preview-content-wrapper, [class*="wrapper"]')||t;if(!e)return;const i="msword-rtl-justify-style";if(!t.querySelector(`style[data-wordpreview-style="${i}"]`)){const c=document.createElement("style");c.setAttribute("data-wordpreview-style",i),c.textContent=`
        .docx-wrapper,
        .docx-preview-content-wrapper {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          padding: 24px 20px !important;
          background: transparent !important;
          box-sizing: border-box !important;
          direction: ltr !important;
        }
        .docx-wrapper > section.docx,
        .docx-wrapper > article.docx,
        .docx-wrapper .docx,
        .docx-preview-content-wrapper > section,
        .docx-preview-content-wrapper > article,
        .docx-preview-content-wrapper .docx-preview-content {
          margin: 10px auto !important;
          box-sizing: border-box !important;
          overflow: visible !important;
          position: relative !important;
        }
        .docx-wrapper p,
        .docx-preview-content-wrapper p {
          text-align: justify !important;
          text-justify: inter-word !important;
          text-align-last: right !important;
          direction: rtl !important;
          unicode-bidi: embed !important;
        }
        .docx-wrapper table,
        .docx-preview-content-wrapper table {
          direction: rtl !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        .docx-wrapper td,
        .docx-wrapper th,
        .docx-preview-content-wrapper td,
        .docx-preview-content-wrapper th {
          direction: rtl !important;
          unicode-bidi: embed !important;
        }
      `,t.prepend(c)}e.style.setProperty("direction","ltr","important"),e.style.setProperty("display","flex","important"),e.style.setProperty("flex-direction","column","important"),e.style.setProperty("align-items","center","important"),e.querySelectorAll(".docx, .docx-preview-content, section, article").forEach(c=>{const o=c;o.style.setProperty("margin-left","auto","important"),o.style.setProperty("margin-right","auto","important"),o.style.setProperty("overflow","visible","important")}),e.querySelectorAll("p").forEach(c=>{const o=c;o.style.textAlign="justify",o.style.textAlignLast="right",o.style.direction="rtl",o.style.unicodeBidi="embed"}),e.querySelectorAll("table").forEach(c=>{const o=c;o.style.direction="rtl",o.style.unicodeBidi="embed",o.style.maxWidth="100%"})}catch{}}async function $(t,e){const i=t.includes("supabase.co/storage/v1/object/public/"),n=`${t}${t.includes("?")?"&":"?"}cb=${Date.now()}`,s=await fetch(n,{cache:"no-store",mode:"cors",credentials:i?"omit":"include",signal:e});if(!s.ok)throw new Error(`Failed to load document (${s.status})`);return await s.arrayBuffer()}async function W(t,e){const i=await fetch("/templates/headers/DECOR ADOUL 33.docx",{signal:e});if(!i.ok)throw new Error("Failed to fetch template");const n=await i.arrayBuffer(),s=new F(n);N(s,t);const f=s.generate({type:"uint8array"});return f.buffer.slice(f.byteOffset,f.byteOffset+f.byteLength)}const C=A.forwardRef(({url:t,isDarkMode:e,textContent:i,editable:n,onReady:s,sourceTag:f,msWordRtlJustify:c=!0},o)=>{const b=d.useRef(null),h=d.useRef(null),x=d.useRef(0),[E,j]=d.useState(null),[L,g]=d.useState(!0);return A.useImperativeHandle(o,()=>({getPlainText:()=>{const r=b.current;if(!r)return"";const a=r.cloneNode(!0);a.querySelectorAll("style,script,noscript,link,meta,svg").forEach(l=>l.remove());let w=(a.innerText||a.textContent||"").replace(/\u00a0/g," ");if(w=w.replace(/\s+$/g,"").trim(),w)return w;const m=a.querySelector(".docx-wrapper");return((m==null?void 0:m.textContent)||"").replace(/\u00a0/g," ").replace(/\s+$/g,"").trim()}})),d.useEffect(()=>{try{const r=b.current;if(!r)return;r.setAttribute("contenteditable",n?"true":"false"),r.setAttribute("spellcheck","false"),r.contentEditable=n?"true":"false",r.style.outline=n?"2px solid rgba(37, 99, 235, 0.35)":"none",r.style.outlineOffset=n?"6px":"0px"}catch{}},[n]),d.useEffect(()=>{var m;const r=++x.current;(m=h.current)==null||m.abort();const a=new AbortController;return h.current=a,(async()=>{const l=b.current;if(l){g(!0),j(null);try{try{l.replaceChildren()}catch{l.innerHTML=""}S(l),l.style.position="static";let u;if(t)if(t.startsWith("data:")||t.startsWith("blob:")){const v=await fetch(t,{signal:a.signal});if(!v.ok)throw new Error(`Failed to read URL (${v.status})`);u=await v.arrayBuffer()}else u=await $(t,a.signal);else if(i)u=await W(i,a.signal);else{g(!1);return}if(a.signal.aborted||r!==x.current)return;const R={className:"docx",inWrapper:!0,ignoreHeight:!1,ignoreWidth:!1,breakPages:!0,renderHeaders:!0,renderFooters:!0,renderFootnotes:!0,renderEndnotes:!0,useBase64URL:!0,experimental:!0,trimXmlDeclaration:!0,debug:!1},p=document.createElement("div");if(S(p),await B(u,p,null,R),c?(P(p),requestAnimationFrame(()=>P(p)),setTimeout(()=>P(p),0)):(q(p),requestAnimationFrame(()=>q(p))),a.signal.aborted||r!==x.current)return;try{l.replaceChildren(p)}catch{l.innerHTML="",l.appendChild(p)}r===x.current&&(g(!1),s==null||s())}catch(u){if(a.signal.aborted||r!==x.current)return;g(!1),j((u==null?void 0:u.message)||"Failed to render DOCX")}}})(),()=>a.abort()},[t,i,f,s]),d.useEffect(()=>()=>{var r;(r=h.current)==null||r.abort()},[]),E?y.jsx("div",{className:"w-full h-full flex items-center justify-center p-4",children:y.jsx("div",{className:`text-sm font-bold ${e?"text-red-300":"text-red-700"}`,children:E})}):y.jsxs("div",{className:"w-full h-full relative",children:[L&&y.jsx("div",{className:"absolute inset-0 flex items-center justify-center",children:y.jsx("div",{className:`text-xs font-bold ${e?"text-slate-300":"text-slate-600"}`,children:"Loading…"})}),y.jsx("div",{ref:b,className:"w-full h-full",dir:"ltr"})]})});C.displayName="WordPreview";export{C as W};
