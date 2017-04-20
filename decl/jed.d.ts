
interface JedInstance {
  translate: any;
  ngettext: any;
}

interface JedConstructor {
  new(s: any): JedInstance;
}

declare namespace JedLib {
  const Jed: JedConstructor;
}

declare module "jed" {
  export = JedLib;
}

