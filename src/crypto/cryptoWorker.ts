export interface CryptoWorker {
  postMessage(message: any): void;

  terminate(): void;

  onmessage: (m: any) => void;
  onerror: (m: any) => void;
}