// Type definitions for URI.js 1.15.1
// Project: https://github.com/medialize/URI.js
// Definitions by: RodneyJT <https://github.com/RodneyJT>, Brian Surowiec <https://github.com/xt0rted>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// Modified by Florian Dold <dold@taler.net>

declare module "urijs" {
  interface URIOptions {
      protocol?: string;
      username?: string;
      password?: string;
      hostname?: string;
      port?: string;
      path?: string;
      query?: string;
      fragment?: string;
  }

  class URI {
    public constructor();
    public constructor (value: string | URIOptions | HTMLElement);

    static addQuery(data: Object, prop: string, value: string): Object;
    static addQuery(data: Object, qryObj: Object): Object;

    static build(parts: {
        protocol: string;
        username: string;
        password: string;
        hostname: string;
        port: string;
        path: string;
        query: string;
        fragment: string;
    }): string;
    static buildAuthority(parts: {
        username?: string;
        password?: string;
        hostname?: string;
        port?: string;
    }): string;
    static buildHost(parts: {
        hostname?: string;
        port?: string;
    }): string;
    static buildQuery(qry: Object): string;
    static buildQuery(qry: Object, duplicates: boolean): string;
    static buildUserinfo(parts: {
        username?: string;
        password?: string;
    }): string;

    static commonPath(path1: string, path2: string): string;

    static decode(str: string): string;
    static decodeQuery(qry: string): string;

    static encode(str: string): string;
    static encodeQuery(qry: string): string;
    static encodeReserved(str: string): string;
    static expand(template: string, vals: Object): URI;

    static iso8859(): void;

    static joinPaths(...paths: (string | URI)[]): URI;

    static parse(url: string): {
        protocol: string;
        username: string;
        password: string;
        hostname: string;
        port: string;
        path: string;
        query: string;
        fragment: string;
    };
    static parseAuthority(url: string, parts: {
        username?: string;
        password?: string;
        hostname?: string;
        port?: string;
    }): string;
    static parseHost(url: string, parts: {
        hostname?: string;
        port?: string;
    }): string;
    static parseQuery(url: string): Object;
    static parseUserinfo(url: string, parts: {
        username?: string;
        password?: string;
    }): string;

    static removeQuery(data: Object, prop: string, value: string): Object;
    static removeQuery(data: Object, props: string[]): Object;
    static removeQuery(data: Object, props: Object): Object;

    static unicode(): void;

    static withinString(source: string, func: (url: string) => string): string;

    absoluteTo(path: string): URI;
    absoluteTo(path: URI): URI;
    addFragment(fragment: string): URI;
    addQuery(qry: string): URI;
    addQuery(qry: Object): URI;
    addSearch(qry: string): URI;
    addSearch(key: string, value:any): URI;
    addSearch(qry: Object): URI;
    authority(): string;
    authority(authority: string): URI;

    clone(): URI;

    directory(): string;
    directory(dir: boolean): string;
    directory(dir: string): URI;
    domain(): string;
    domain(domain: boolean): string;
    domain(domain: string): URI;

    duplicateQueryParameters(val: boolean): URI;

    equals(): boolean;
    equals(url: string | URI): boolean;

    filename(): string;
    filename(file: boolean): string;
    filename(file: string): URI;
    fragment(): string;
    fragment(fragment: string): URI;
    fragmentPrefix(prefix: string): URI;

    hash(): string;
    hash(hash: string): URI;
    host(): string;
    host(host: string): URI;
    hostname(): string;
    hostname(hostname: string): URI;
    href(): string;
    href(url: string): void;

    is(qry: string): boolean;
    iso8859(): URI;

    normalize(): URI;
    normalizeFragment(): URI;
    normalizeHash(): URI;
    normalizeHostname(): URI;
    normalizePath(): URI;
    normalizePathname(): URI;
    normalizePort(): URI;
    normalizeProtocol(): URI;
    normalizeQuery(): URI;
    normalizeSearch(): URI;

    origin(): string;
    origin(uri: string | URI): URI;

    password(): string;
    password(pw: string): URI;
    path(): string;
    path(path: boolean): string;
    path(path: string): URI;
    pathname(): string;
    pathname(path: boolean): string;
    pathname(path: string): URI;
    port(): string;
    port(port: string): URI;
    protocol(): string;
    protocol(protocol: string): URI;

    query(): string;
    query(qry: string): URI;
    query(qry: boolean): Object;
    query(qry: Object): URI;

    readable(): string;
    relativeTo(path: string): URI;
    removeQuery(qry: string): URI;
    removeQuery(qry: Object): URI;
    removeSearch(qry: string): URI;
    removeSearch(qry: Object): URI;
    resource(): string;
    resource(resource: string): URI;

    scheme(): string;
    scheme(protocol: string): URI;
    search(): string;
    search(qry: string): URI;
    search(qry: boolean): any;
    search(qry: Object): URI;
    segment(): string[];
    segment(segments: string[]): URI;
    segment(position: number): string;
    segment(position: number, level: string): URI;
    segment(segment: string): URI;
    segmentCoded(): string[];
    segmentCoded(segments: string[]): URI;
    segmentCoded(position: number): string;
    segmentCoded(position: number, level: string): URI;
    segmentCoded(segment: string): URI;
    setQuery(key: string, value: string): URI;
    setQuery(qry: Object): URI;
    setSearch(key: string, value: string): URI;
    setSearch(qry: Object): URI;
    hasQuery(name: string | any, value?: string | number | boolean | Function | Array<string> | Array<number> | Array<boolean> | RegExp, withinArray?: boolean): boolean;
    hasSearch(name: string | any, value?: string | number | boolean | Function | Array<string> | Array<number> | Array<boolean> | RegExp, withinArray?: boolean): boolean;
    subdomain(): string;
    subdomain(subdomain: string): URI;
    suffix(): string;
    suffix(suffix: boolean): string;
    suffix(suffix: string): URI;

    tld(): string;
    tld(tld: boolean): string;
    tld(tld: string): URI;

    unicode(): URI;
    userinfo(): string;
    userinfo(userinfo: string): URI;
    username(): string;
    username(uname: string): URI;

    valueOf(): string;
  }
  export = URI;
}
