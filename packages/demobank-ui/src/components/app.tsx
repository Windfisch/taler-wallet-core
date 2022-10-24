import { FunctionalComponent, h } from 'preact';
import { TranslationProvider } from '../context/translation';
import { BankHome } from '../pages/home/index';
import { Menu } from './menu';

const App: FunctionalComponent = () => {
  return (
    <TranslationProvider>
      <BankHome />
    </TranslationProvider>
  );
};

export default App;
