/**
 * AuthModal
 *
 * In-page sign-in/sign-up dialog used by ResultAuthGate (and anywhere else
 * that needs auth without leaving the current page). Deliberately does NOT
 * navigate anywhere — the calculator or tool behind it stays mounted the
 * whole time, so its input state survives the sign-in flow. Once Firebase's
 * onAuthStateChanged fires, the parent component (e.g. ResultAuthGate) stops
 * rendering this gate/modal on its own re-render, which closes the dialog
 * naturally. We also close it explicitly on success as a belt-and-suspenders
 * measure in case the parent doesn't unmount immediately.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/firebase";
import { sanitizeAuthError } from "@/lib/errorHandler";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "signup";
  /** Optional context shown in the dialog header, e.g. "Income Tax Calculator" */
  toolName?: string;
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function AuthModal({ open, onOpenChange, defaultTab = "login", toolName }: AuthModalProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"login" | "signup">(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConsent, setSignupConsent] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      // No destination argument on purpose: if the popup is blocked and this
      // falls back to a redirect, we want the user returned to THIS page — the
      // calculator they were using — not sent off to the dashboard.
      await signInWithGoogle();
      toast({ title: "Success", description: "Signed in with Google successfully!" });
      onOpenChange(false);
    } catch (error: any) {
      console.error("[AuthModal] Google sign-in error:", error);
      toast({ title: "Error", description: sanitizeAuthError(error), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmail(loginEmail, loginPassword);
      toast({ title: "Success", description: "Logged in successfully!" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: sanitizeAuthError(error), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupConsent) {
      toast({ title: "Please agree to our Privacy Policy to create an account.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await signUpWithEmail(signupEmail, signupPassword);
      toast({ title: "Success", description: "Account created successfully!" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: sanitizeAuthError(error), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tab === "signup" ? "Create your free account" : "Sign in to AiTaxBot"}</DialogTitle>
          <DialogDescription>
            {toolName ? `Your ${toolName} result is ready — sign in to view it. ` : ""}
            Your inputs on this page stay right where they are.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
            <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-4 mt-4">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <Label htmlFor="modal-login-email">Email</Label>
                <Input
                  id="modal-login-email"
                  type="email"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  data-testid="input-modal-login-email"
                />
              </div>
              <div>
                <Label htmlFor="modal-login-password">Password</Label>
                <Input
                  id="modal-login-password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  data-testid="input-modal-login-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-modal-login-email">
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              data-testid="button-modal-google-signin"
            >
              <GoogleIcon />
              Sign in with Google
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-4">
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div>
                <Label htmlFor="modal-signup-email">Email</Label>
                <Input
                  id="modal-signup-email"
                  type="email"
                  placeholder="your@email.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  data-testid="input-modal-signup-email"
                />
              </div>
              <div>
                <Label htmlFor="modal-signup-password">Password</Label>
                <Input
                  id="modal-signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-modal-signup-password"
                />
                <p className="text-xs text-slate-500 mt-1">Minimum 6 characters</p>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signupConsent}
                  onChange={(e) => setSignupConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                  data-testid="checkbox-modal-signup-consent"
                />
                <span className="text-xs text-slate-600">
                  I agree to AiTaxBot's{" "}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Terms of Service
                  </a>.
                </span>
              </label>
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !signupConsent}
                data-testid="button-modal-signup-email"
              >
                {isLoading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">Or continue with</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (!signupConsent) {
                  toast({ title: "Please agree to our Privacy Policy to create an account.", variant: "destructive" });
                  return;
                }
                handleGoogleSignIn();
              }}
              disabled={isLoading || !signupConsent}
              data-testid="button-modal-google-signup"
            >
              <GoogleIcon />
              Sign up with Google
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
