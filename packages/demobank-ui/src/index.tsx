import App from "./components/app";
export default App;
import { render, h, Fragment } from "preact";

const app = document.getElementById("app");

render(<App />, app as any);
