'use client';

import { useEffect, useRef } from 'react';
import { useSchemaContext } from '@/contexts/SchemaContext';
import type { ModelSchema } from '@/types';

const GLOBAL_CSS_ID = 'djnext-custom-css-global';
const GLOBAL_JS_ID = 'djnext-custom-js-global';
const MODEL_CSS_ID_PREFIX = 'djnext-custom-css-model-';
const MODEL_JS_ID_PREFIX = 'djnext-custom-js-model-';

function injectLinks(urls: string[], idPrefix: string): HTMLLinkElement[] {
  const elts: HTMLLinkElement[] = [];
  urls.forEach((href, i) => {
    const id = `${idPrefix}${i}`;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    elts.push(link);
  });
  return elts;
}

function injectScripts(urls: string[], idPrefix: string): HTMLScriptElement[] {
  const elts: HTMLScriptElement[] = [];
  urls.forEach((src, i) => {
    const id = `${idPrefix}${i}`;
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = false;
    document.head.appendChild(script);
    elts.push(script);
  });
  return elts;
}

function removeByIdPrefix(prefix: string) {
  document.querySelectorAll(`[id^="${prefix}"]`).forEach((el) => el.remove());
}

/**
 * Injects global custom CSS/JS from schema.site (CUSTOM_CSS, CUSTOM_JS).
 * Render once inside SchemaProvider (e.g. in layout or providers).
 */
export function GlobalMediaInjector() {
  const { schema } = useSchemaContext();
  const injected = useRef(false);

  useEffect(() => {
    if (!schema?.site || injected.current) return;
    const css = schema.site.custom_css ?? [];
    const js = schema.site.custom_js ?? [];
    if (css.length || js.length) {
      injectLinks(css, `${GLOBAL_CSS_ID}-`);
      injectScripts(js, `${GLOBAL_JS_ID}-`);
      injected.current = true;
    }
  }, [schema?.site]);

  return null;
}

interface ModelMediaInjectorProps {
  modelSchema: ModelSchema | null | undefined;
}

/**
 * Injects per-model custom CSS/JS from modelSchema (djnext_media).
 * Renders and cleans up when unmounting or when URLs change (stable deps so scripts get to run).
 */
export function ModelMediaInjector({ modelSchema }: ModelMediaInjectorProps) {
  const cssKey = modelSchema?.custom_css?.join(',') ?? '';
  const jsKey = modelSchema?.custom_js?.join(',') ?? '';

  useEffect(() => {
    if (!cssKey && !jsKey) {
      return () => {
        removeByIdPrefix(MODEL_CSS_ID_PREFIX);
        removeByIdPrefix(MODEL_JS_ID_PREFIX);
      };
    }
    const css = modelSchema?.custom_css ?? [];
    const js = modelSchema?.custom_js ?? [];
    injectLinks(css, MODEL_CSS_ID_PREFIX);
    injectScripts(js, MODEL_JS_ID_PREFIX);
    return () => {
      removeByIdPrefix(MODEL_CSS_ID_PREFIX);
      removeByIdPrefix(MODEL_JS_ID_PREFIX);
    };
  }, [cssKey, jsKey]);

  return null;
}
