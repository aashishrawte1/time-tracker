import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { AcceptInvite } from "./pages/AcceptInvite";
import { Dashboard } from "./pages/Dashboard";
import { Projects } from "./pages/Projects";
import { Summary } from "./pages/Summary";
import { Timesheet } from "./pages/Timesheet";
import { Team } from "./pages/Team";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename="/time-tracker">
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/app" element={<Dashboard />} />
                <Route path="/app/projects" element={<Projects />} />
                <Route path="/app/summary" element={<Summary />} />
                <Route path="/app/timesheet" element={<Timesheet />} />
                <Route path="/app/team" element={<Team />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
