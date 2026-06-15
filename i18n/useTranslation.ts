import translations from './es-PE.json';

function resolve(obj: Record<string, any>, path: string): string | undefined {
  return path.split('.').reduce<any>((cur, key) => (cur && typeof cur === 'object' ? cur[key] : undefined), obj);
}

export function useTranslation() {
  const t = (key: string, params?: Record<string, string | number>): string => {
    const value = resolve(translations as Record<string, any>, key);
    if (typeof value !== 'string') return key;
    if (!params) return value;
    return Object.entries(params).reduce(
      (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
      value,
    );
  };
  return { t };
}
