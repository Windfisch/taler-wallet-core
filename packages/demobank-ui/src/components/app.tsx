import { FunctionalComponent } from "preact";
import { TranslationProvider } from "../context/translation";
import { BankHome } from "../pages/home/index";

const App: FunctionalComponent = () => {
  return (
    <TranslationProvider>
      <BankHome />
    </TranslationProvider>
  );
};

export default App;
