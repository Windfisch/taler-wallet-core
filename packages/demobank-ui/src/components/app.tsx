import { h, FunctionalComponent } from "preact";
import { TranslationProvider } from "../context/translation.js";
import { BankHome } from "../pages/home/index.js";

const App: FunctionalComponent = () => {
  return (
    <TranslationProvider>
      <BankHome />
    </TranslationProvider>
  );
};

export default App;
