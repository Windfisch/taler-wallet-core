interface System {
  import(name: string): Promise<any>;
  defined: any;
  amdDefine: () => void;
  amdRequire: () => void;
  baseURL: string;
  paths: { [key: string]: string };
  meta: { [key: string]: Object };
  config: any;
  newModule(obj: Object): any;
  normalizeSync(name: string): string;
  set(moduleName: string, module: any): void;
}


declare var System: System;

declare module "systemjs" {
  export = System;
}