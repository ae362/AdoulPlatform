function a(){return Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(e=>{if(e.tagName.toLowerCase()==="link"){const i=e.href;return i?`<link rel="stylesheet" href="${i}">`:""}return`<style>${e.textContent??""}</style>`}).join(`
`)}function c(o,e={}){const t=document.createElement("iframe");t.style.position="fixed",t.style.right="0",t.style.bottom="0",t.style.width="0",t.style.height="0",t.style.border="0",t.style.opacity="0",t.setAttribute("aria-hidden","true"),document.body.appendChild(t);const l=a(),i=`
    @page { margin: 0; }
    html, body { margin: 0; padding: 0; height: auto; }
    .no-print { display: none !important; }
  `,n=t.contentDocument;if(!n){t.remove(),window.print();return}n.open(),n.write(`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${e.title??document.title}</title>
    ${l}
    <style>${i}
${e.extraCss??""}</style>
  </head>
  <body>
    <div id="__print_root__"></div>
  </body>
</html>`),n.close();const s=n.getElementById("__print_root__");if(!s){t.remove(),window.print();return}s.appendChild(o.cloneNode(!0));const r=t.contentWindow;if(!r){t.remove(),window.print();return}const d=()=>{r.removeEventListener("afterprint",d),t.remove()};r.addEventListener("afterprint",d),setTimeout(()=>{r.focus(),r.print()},500),setTimeout(()=>{document.body.contains(t)&&t.remove()},3e4)}export{c as p};
