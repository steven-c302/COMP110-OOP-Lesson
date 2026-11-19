import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./styles/global.css";

const Play = lazy(() => import("./pages/Play.tsx"));
const Host = lazy(() => import("./pages/Host.tsx"));
const Screen = lazy(() => import("./pages/Screen.tsx"));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/host" element={<Host />} />
          <Route path="/screen" element={<Screen />} />
          <Route path="*" element={<Play />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
