import { HashRouter, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Toaster } from "./components/ui/sonner";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import Halftone from "./pages/Halftone";
import Cutout from "./pages/Cutout";
import Ascii from "./pages/Ascii";
import AuthCallback from "./pages/AuthCallback";
import { AuthProvider } from "./contexts/AuthContext";
import { LoginDialog } from "./components/LoginDialog";
import { RegisterDialog } from "./components/RegisterDialog";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <ErrorBoundary>
          <div className="min-h-screen bg-white">
            <Header />
            <Toaster />
            <LoginDialog />
            <RegisterDialog />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/about" element={<About />} />
              <Route path="/halftone" element={<Halftone />} />
              <Route path="/cutout" element={<Cutout />} />
              <Route path="/ascii" element={<Ascii />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </div>
        </ErrorBoundary>
      </HashRouter>
    </AuthProvider>
  );
}
