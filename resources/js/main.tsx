import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "../css/app.css";
import "./i18n";

createRoot(document.getElementById("root")!).render(<App />);
