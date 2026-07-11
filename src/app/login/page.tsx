import { Suspense } from "react";
import LoginPage from "./LoginForm";

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted">טוען...</div>}>
      <LoginPage />
    </Suspense>
  );
}
