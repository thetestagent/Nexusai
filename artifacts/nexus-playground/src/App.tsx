import { Component, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { ClerkProvider, SignIn, SignUp, useClerk, useAuth } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Redirect, Router as WouterRouter } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import LandingPage from "@/pages/Landing";
import IDEPage from "@/pages/IDE";
import AIPage from "@/pages/AI";
import DashboardPage from "@/pages/Dashboard";
import NotFoundPage from "@/pages/not-found";

const queryClient = new QueryClient();

const clerkPubKey =
  publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) ??
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// VITE_CLERK_PROXY_URL is auto-set by Replit in production.
// In dev, route through our API proxy to bypass clerk.localhost DNS.
const _proxyHost = window.location.host;
const _proxyProto =
  _proxyHost === "localhost" || _proxyHost.startsWith("localhost:")
    ? "http"
    : window.location.protocol;
const clerkProxyUrl =
  import.meta.env.VITE_CLERK_PROXY_URL ||
  `${_proxyProto}//${_proxyHost}/api/__clerk`;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "bottom" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#4F46E5",
    colorForeground: "#111827",
    colorMutedForeground: "#6B7280",
    colorDanger: "#EF4444",
    colorBackground: "#FFFFFF",
    colorInput: "#F9FAFB",
    colorInputForeground: "#111827",
    colorNeutral: "#E5E7EB",
    fontFamily: "Inter, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-slate-200",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-slate-900 font-bold text-2xl",
    headerSubtitle: "text-slate-500",
    socialButtonsBlockButtonText: "text-slate-700 font-medium",
    formFieldLabel: "text-slate-700 font-medium",
    footerActionLink: "text-indigo-600 font-semibold",
    footerActionText: "text-slate-500",
    dividerText: "text-slate-400",
    identityPreviewEditButton: "text-indigo-600",
    formFieldSuccessText: "text-green-600",
    alertText: "text-slate-700",
    logoBox: "mb-2",
    logoImage: "h-10 w-auto",
    socialButtonsBlockButton: "border border-slate-200 bg-white hover:bg-slate-50",
    formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold",
    formFieldInput: "border-slate-300 bg-slate-50 text-slate-900",
    footerAction: "bg-slate-50 border-t border-slate-100",
    dividerLine: "bg-slate-200",
    alert: "border-red-200 bg-red-50",
    otpCodeFieldInput: "border-slate-300",
    formFieldRow: "",
    main: "p-6",
  },
};

// Error boundary to catch Clerk initialization failures
class ClerkErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== uid) qc.clear();
      prevRef.current = uid;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  // Show landing page immediately while Clerk loads; redirect once auth state resolves
  if (!isLoaded) return <LandingPage />;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <LandingPage />;
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect to="/sign-in" />;
  return <Component />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkErrorBoundary fallback={
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Switch>
            <Route path="/" component={LandingPage} />
            <Route path="/ide" component={IDEPage} />
            <Route path="/ai" component={AIPage} />
            <Route component={NotFoundPage} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    }>
      <ClerkProvider
        publishableKey={clerkPubKey ?? ""}
        proxyUrl={clerkProxyUrl}
        appearance={clerkAppearance}
        signInUrl={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        localization={{
          signIn: { start: { title: "Welcome back to NEXUS", subtitle: "Sign in to your account" } },
          signUp: { start: { title: "Join NEXUS", subtitle: "Start building with AI-native code" } },
        }}
        routerPush={(to) => setLocation(stripBase(to))}
        routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
      >
        <QueryClientProvider client={queryClient}>
          <ClerkQueryClientCacheInvalidator />
          <TooltipProvider>
            <Switch>
              <Route path="/" component={HomeRoute} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />
              <Route path="/ide" component={() => <ProtectedRoute component={IDEPage} />} />
              <Route path="/ai" component={AIPage} />
              <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
              <Route component={NotFoundPage} />
            </Switch>
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ClerkProvider>
    </ClerkErrorBoundary>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
