import {
  createContext,
  FormEvent,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { mapAuthSignInError, mapAuthSignUpError } from "../lib/uiCopy";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export type AuthUser = {
  id: string;
  email?: string;
  handle: string;
  name: string;
};

type AuthContextValue = {
  session: Session | null;
  user: AuthUser | null;
  handle: string;
  loading: boolean;
  isDemoMode: boolean;
  signUp: (email: string, password: string, meta?: { name?: string; handle?: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: (patch?: Partial<AuthUser>) => void;
};

const demoUser: AuthUser = {
  id: "demo-user",
  email: "threadandtonic@example.com",
  handle: "threadandtonic",
  name: "June Mercer",
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toAuthUser(user: User | null | undefined, fallbackHandle = "stitcher"): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email,
    handle: String(meta.handle || fallbackHandle).toLowerCase(),
    name: String(meta.name || user.email?.split("@")[0] || "Stitcher"),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(() => (isSupabaseConfigured ? null : demoUser));
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setUser(demoUser);
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(toAuthUser(data.session?.user));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(toAuthUser(next?.user));
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, meta?: { name?: string; handle?: string }) => {
    if (!isSupabaseConfigured || !supabase) {
      setUser({
        ...demoUser,
        email,
        name: meta?.name || demoUser.name,
        handle: (meta?.handle || demoUser.handle).toLowerCase(),
      });
      return;
    }

    const handle = (meta?.handle || email.split("@")[0] || "stitcher")
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 24);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          handle: handle.length >= 3 ? handle : "stitcher",
          name: meta?.name || email.split("@")[0] || "Stitcher",
        },
      },
    });
    if (error) throw error;
    setSession(data.session);
    setUser(toAuthUser(data.session?.user ?? data.user, handle));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured || !supabase) {
      setUser({ ...demoUser, email });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setSession(data.session);
    setUser(toAuthUser(data.session?.user));
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      return;
    }
    setUser(demoUser);
  }, []);

  const refreshUser = useCallback((patch?: Partial<AuthUser>) => {
    setUser((current) => {
      if (!current && !patch) return current;
      if (!current) {
        return {
          id: patch?.id || "unknown",
          email: patch?.email,
          handle: patch?.handle || "stitcher",
          name: patch?.name || "Stitcher",
        };
      }
      return { ...current, ...patch };
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: isSupabaseConfigured ? user : user ?? demoUser,
      handle: (isSupabaseConfigured ? user?.handle : user?.handle ?? demoUser.handle) || "stitcher",
      loading,
      isDemoMode: !isSupabaseConfigured,
      signUp,
      signIn,
      signOut,
      refreshUser,
    }),
    [session, user, loading, signUp, signIn, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const { signIn, signUp, isDemoMode, handle } = useAuth();
  const [email, setEmail] = useState(mode === "signin" ? "threadandtonic@example.com" : "");
  const [password, setPassword] = useState(mode === "signin" ? "demo-password" : "");
  const [name, setName] = useState("");
  const [chosenHandle, setChosenHandle] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setIsError(false);
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(email, password, { name, handle: chosenHandle });
      setMessage(isDemoMode ? `Demo session active as @${handle}.` : mode === "signin" ? "Signed in." : "Account created.");
      setIsError(false);
    } catch (error) {
      console.error(mode === "signin" ? "signIn failed" : "signUp failed", error);
      setMessage(mode === "signin" ? mapAuthSignInError(error) : mapAuthSignUpError(error));
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth-form panel form-grid" onSubmit={submit} noValidate={false} aria-busy={busy || undefined}>
      {mode === "signup" && (
        <>
          <label htmlFor={`${mode}-name`} className="full-field">
            <span className="label-text">Display name</span>
            <input
              id={`${mode}-name`}
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              required
            />
          </label>
          <label htmlFor={`${mode}-handle`} className="full-field">
            <span className="label-text">Handle</span>
            <input
              id={`${mode}-handle`}
              name="username"
              autoComplete="username"
              value={chosenHandle}
              onChange={(event) => setChosenHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="yourhandle"
              required
              minLength={3}
              maxLength={32}
            />
          </label>
        </>
      )}
      <label htmlFor={`${mode}-email`} className="full-field">
        <span className="label-text">Email</span>
        <input
          id={`${mode}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@email.com"
          required
        />
      </label>
      <label htmlFor={`${mode}-password`} className="full-field">
        <span className="label-text">Password</span>
        <input
          id={`${mode}-password`}
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={mode === "signin" ? "Your password" : "At least 6 characters"}
          required
          minLength={6}
        />
      </label>
      <button className="primary full-field auth-submit" type="submit" disabled={busy}>
        {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>
      {message ? (
        <p className={`full-field auth-message${isError ? " auth-message--error" : ""}`} role={isError ? "alert" : "status"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
