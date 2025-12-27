import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "react-hot-toast";
import EvalsPage from "./components/evals/EvalsPage.tsx";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import PairwiseEvalsPage from "./components/evals/PairwiseEvalsPage";
import RunEvalsPage from "./components/evals/RunEvalsPage.tsx";
import BestOfNEvalsPage from "./components/evals/BestOfNEvalsPage.tsx";
import AllEvalsPage from "./components/evals/AllEvalsPage.tsx";
import { initializeTheme } from "./hooks/useTheme";

// Initialize theme before React renders to prevent flash of wrong theme
initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/evals" element={<AllEvalsPage />} />
        <Route path="/evals/single" element={<EvalsPage />} />
        <Route path="/evals/pairwise" element={<PairwiseEvalsPage />} />
        <Route path="/evals/best-of-n" element={<BestOfNEvalsPage />} />
        <Route path="/evals/run" element={<RunEvalsPage />} />
      </Routes>
    </Router>
    <Toaster toastOptions={{ className: "dark:bg-card dark:text-foreground" }} />
  </React.StrictMode>
);
