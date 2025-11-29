import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // <-- BU EKLENDİ

import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <BrowserRouter> {/* <-- APP BUNUN İÇİNE ALINDI */}
      <App />
    </BrowserRouter>
  </StrictMode>
);
