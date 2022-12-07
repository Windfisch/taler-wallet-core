import { h, FunctionalComponent } from "preact";
import { BackendStateProvider } from "../context/backend.js";
import { PageStateProvider } from "../context/pageState.js";
import { TranslationProvider } from "../context/translation.js";
import { Routing } from "../pages/Routing.js";

/**
 * FIXME:
 *
 * - INPUT elements have their 'required' attribute ignored.
 *
 * - the page needs a "home" button that either redirects to
 *   the profile page (when the user is logged in), or to
 *   the very initial home page.
 *
 * - histories 'pages' are grouped in UL elements that cause
 *   the rendering to visually separate each UL.  History elements
 *   should instead line up without any separation caused by
 *   a implementation detail.
 *
 * - Many strings need to be i18n-wrapped.
 */

const App: FunctionalComponent = () => {
  return (
    <TranslationProvider>
      <PageStateProvider>
        <BackendStateProvider>
          <Routing />
        </BackendStateProvider>
      </PageStateProvider>
    </TranslationProvider>
  );
};

export default App;
