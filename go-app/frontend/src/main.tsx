import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import App from "./App";
import { GetTheme } from "../wailsjs/go/main/App";
import { updateTheme, UpdateThemeValue } from "./utils/updateTheme";

const container = document.getElementById("root");

const root = createRoot(container!);

GetTheme().then((theme) => {
  updateTheme(theme as UpdateThemeValue);
});

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
