import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import CommandCenter from "./pages/CommandCenter";
import "./index.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/command" element={<CommandCenter />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;