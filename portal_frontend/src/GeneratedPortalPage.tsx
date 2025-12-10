import React, { useEffect } from 'react';
import Layout from './components/Layout';

export default function GeneratedPortalPage(): JSX.Element {
  useEffect(() => {
    // Load external scripts (lucide, ethers) if not present.
    function ensureScript(id: string, src: string) {
      if (document.getElementById(id)) return;
      const s = document.createElement('script');
      s.id = id;
      s.src = src;
      s.async = true;
      document.head.appendChild(s);
    }

    ensureScript('lucide-cdn', 'https://unpkg.com/lucide@latest');
    ensureScript('ethers-cdn', 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js');

    const t = setTimeout(() => {
      try {
        const w: any = window;
        if (w.lucide && typeof w.lucide.createIcons === 'function') {
          w.lucide.createIcons({ attrs: { 'stroke-width': 1.5 } });
        }
      } catch (e) {
        // ignore
      }
    }, 600);

    return () => clearTimeout(t);
  }, []);

  return <Layout />;
}
