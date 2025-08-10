// src/hooks/useAgendaFeed.ts
import { useState, useEffect } from 'react';

export interface AgendaItem {
  title:       string;
  link:        string;
  description: string;
  pubDate:     string;
  author?:     string;
  categories:  string[];
  thumbnailUrl?: string;
  [key: string]: any;
}

export function useAgendaFeed(feedUrl: string) {
  const [items, setItems]     = useState<AgendaItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<Error | null>(null);

  useEffect(() => {
    if (!feedUrl) return;
    setLoading(true);
    fetch(feedUrl)
      .then(res => res.text())
      .then(xmlText => {
        const dom      = new window.DOMParser().parseFromString(xmlText, 'text/xml');
        const rawItems = Array.from(dom.querySelectorAll('item'));
        const parsed: AgendaItem[] = rawItems.map(itemEl => {
          const obj: any = {};
          // extrai todos os campos simples
          itemEl.childNodes.forEach(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            const el      = node as Element;
            const name    = el.tagName;
            const text    = el.textContent?.trim() ?? '';
            if (obj[name]) {
              if (Array.isArray(obj[name])) obj[name].push(text);
              else obj[name] = [obj[name], text];
            } else {
              obj[name] = text;
            }
          });

          // primeiro tenta o <enclosure url="…">
          let thumb: string | undefined;
          const enc = itemEl.querySelector('enclosure[url]');
          if (enc?.getAttribute('url')) {
            thumb = enc.getAttribute('url')!.trim();
          } else {
            // fallback: procura <img> dentro da description
            const desc = obj['description'] as string;
            if (desc) {
              const dd  = new window.DOMParser().parseFromString(desc, 'text/html');
              const img = dd.querySelector('img');
              if (img?.src) thumb = img.src;
            }
          }

          return {
            title:       obj['title']       || '',
            link:        obj['link']        || '',
            description: obj['description'] || '',
            pubDate:     obj['pubDate']     || '',
            author:      obj['author']      || undefined,
            categories:  (obj['category']
                           ? Array.isArray(obj['category'])
                             ? obj['category']
                             : [obj['category']]
                           : []) as string[],
            thumbnailUrl: thumb,
            ...obj
          } as AgendaItem;
        });
        setItems(parsed);
      })
      .catch(err => setError(err))
      .finally(() => setLoading(false));
  }, [feedUrl]);

  return { items, loading, error };
}
