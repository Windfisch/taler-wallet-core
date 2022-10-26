import App from "./components/app.js";
export default App;
import { render, h } from "preact";

const app = document.getElementById("app");

render(<App />, app as any);
