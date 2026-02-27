import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";
import { onAuthStateChanged, type User, logout } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  getIdToken: async () => null,
});

// 30 minutes in milliseconds
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const { toast } = useToast();

  const resetInactivityTimer = () => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Update last activity time
    lastActivityRef.current = Date.now();
    localStorage.setItem('lastActivityTime', lastActivityRef.current.toString());

    // Only set timer if user is authenticated
    if (user) {
      inactivityTimerRef.current = setTimeout(async () => {
        try {
          await logout();
          toast({
            title: "Session Expired",
            description: "You have been logged out due to 30 minutes of inactivity.",
            variant: "destructive",
          });
        } catch (error) {
          console.error("Error during auto-logout:", error);
        }
      }, INACTIVITY_TIMEOUT);
    }
  };

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners for user activity
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Check for activity in other tabs (using localStorage)
    const checkActivity = setInterval(() => {
      const lastActivity = localStorage.getItem('lastActivityTime');
      if (lastActivity) {
        const timeSinceActivity = Date.now() - parseInt(lastActivity);
        if (timeSinceActivity >= INACTIVITY_TIMEOUT && user) {
          logout().then(() => {
            toast({
              title: "Session Expired",
              description: "You have been logged out due to 30 minutes of inactivity.",
              variant: "destructive",
            });
          });
        }
      }
    }, 60000); // Check every minute

    // Initial timer setup
    resetInactivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(checkActivity);
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('[AuthContext] Auth state changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'No user');
      setUser(firebaseUser);
      setLoading(false);
      
      // Reset timer when auth state changes
      if (firebaseUser) {
        resetInactivityTimer();
      } else {
        // Clear timer when logged out
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        localStorage.removeItem('lastActivityTime');
      }
    });

    return () => unsubscribe();
  }, []);

  const getIdToken = async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error("Error getting ID token:", error);
      return null;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
