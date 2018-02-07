/**
 * This is the entry point for redirects, and should be the only
 * web-accessible resource declared in the manifest.  This prevents
 * malicious websites from embedding wallet pages in them.
 * 
 * We still need this redirect page since a webRequest can only directly
 * redirect to pages inside the extension that are a web-accessible resource.
 */

 
const myUrl = new URL(window.location.href);
window.location.replace(myUrl.searchParams.get("url"));
