import { h, FunctionalComponent } from "preact";
import { PageStateProvider } from "../context/pageState.js";
import { TranslationProvider } from "../context/translation.js";
import { BankHome } from "../pages/home/index.js";

const App: FunctionalComponent = () => {
  return (
    <TranslationProvider>
      <PageStateProvider>
        <BankHome />
      </PageStateProvider>
    </TranslationProvider>
  );
};

export default App;
