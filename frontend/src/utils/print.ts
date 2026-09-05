export type PrintElementOptions = {
  title?: string;
  extraCss?: string;
};

function collectHeadMarkup(): string {
  const nodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
  return nodes
    .map((node) => {
      if (node.tagName.toLowerCase() === 'link') {
        const link = node as HTMLLinkElement;
        const href = link.href;
        if (!href) return '';
        return `<link rel="stylesheet" href="${href}">`;
      }

      const style = node as HTMLStyleElement;
      return `<style>${style.textContent ?? ''}</style>`;
    })
    .join('\n');
}

export function printElement(element: HTMLElement, options: PrintElementOptions = {}): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.setAttribute('aria-hidden', 'true');

  document.body.appendChild(iframe);

  const headMarkup = collectHeadMarkup();
  const defaultCss = `
    @page { margin: 0; }
    html, body { margin: 0; padding: 0; height: auto; }
    .no-print { display: none !important; }
  `;

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    window.print();
    return;
  }

  doc.open();
  doc.write(`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${options.title ?? document.title}</title>
    ${headMarkup}
    <style>${defaultCss}\n${options.extraCss ?? ''}</style>
  </head>
  <body>
    <div id="__print_root__"></div>
  </body>
</html>`);
  doc.close();

  const mount = doc.getElementById('__print_root__');
  if (!mount) {
    iframe.remove();
    window.print();
    return;
  }

  mount.appendChild(element.cloneNode(true));

  const printWindow = iframe.contentWindow;
  if (!printWindow) {
    iframe.remove();
    window.print();
    return;
  }

  const cleanup = () => {
    printWindow.removeEventListener('afterprint', cleanup);
    iframe.remove();
  };

  printWindow.addEventListener('afterprint', cleanup);

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 500);

  // Safety cleanup (some browsers don't reliably fire afterprint)
  setTimeout(() => {
    if (document.body.contains(iframe)) iframe.remove();
  }, 30_000);
}

