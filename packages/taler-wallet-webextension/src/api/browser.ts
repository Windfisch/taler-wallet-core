function searchForTalerLinks(): string | undefined {
  let found;
  found = document.querySelector("a[href^='taler://'")
  if (found) return found.toString()
  found = document.querySelector("a[href^='taler+http://'")
  if (found) return found.toString()
  return undefined
}

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}



export async function findTalerUriInActiveTab(): Promise<string | undefined> {
  if (chrome.runtime.getManifest().manifest_version === 3) {
    // manifest v3
    const tab = await getCurrentTab();
    const res = await chrome.scripting.executeScript({
      target: {
        tabId: tab.id!,
        allFrames: true,
      } as any,
      func: searchForTalerLinks,
      args: []
    })
    return res[0].result
  }
  return new Promise((resolve, reject) => {
    //manifest v2
    chrome.tabs.executeScript(
      {
        code: `
        (() => {
          let x = document.querySelector("a[href^='taler://'") || document.querySelector("a[href^='taler+http://'");
          return x ? x.href.toString() : null;
        })();
        `,
        allFrames: false,
      },
      (result) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          resolve(undefined);
          return;
        }
        resolve(result[0]);
      },
    );
  });
}
