
interface JedModule {
  translate: any;
  ngettext: any;
}

interface JedConstructor {
  new(s: any): JedModule;
}

declare const Jed: JedConstructor;

export default Jed;
