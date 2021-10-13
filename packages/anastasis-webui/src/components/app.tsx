import { FunctionalComponent, h } from "preact";

import AnastasisClient from "../routes/home";

const App: FunctionalComponent = () => {
  return (
    <div id="preact_root">
      <AnastasisClient />
    </div>
  );
};

export default App;
