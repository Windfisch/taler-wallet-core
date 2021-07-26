import { useNotNullLocalStorage } from './useLocalStorage';

export function useLang(initial?: string): [string, (s:string) => void] {
  const browserLang: string | undefined = typeof window !== "undefined" ? navigator.language || (navigator as any).userLanguage : undefined;
  const defaultLang = (browserLang || initial || 'en').substring(0, 2)
  return useNotNullLocalStorage('lang-preference', defaultLang)
}
