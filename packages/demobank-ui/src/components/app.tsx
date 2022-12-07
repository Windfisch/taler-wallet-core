import { h, FunctionalComponent } from "preact";
import { PageStateProvider } from "../context/pageState.js";
import { TranslationProvider } from "../context/translation.js";
import { Routing } from "../pages/Routing.js";

const App: FunctionalComponent = () => {
  return (
    <TranslationProvider>
      <PageStateProvider>
        <Routing />
      </PageStateProvider>
    </TranslationProvider>
  );
};

export default App;
