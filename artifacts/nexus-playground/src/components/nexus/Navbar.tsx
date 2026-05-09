import { useUser, useClerk } from "@clerk/react";
import { Link, useLocation } from "wouter";
import { Activity, Bot, LayoutDashboard, LogOut, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [location] = useLocation();

  return (
    <nav className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-xs tracking-tight">NX</span>
          </div>
          <span className="font-bold tracking-wide text-foreground">NEXUS</span>
        </Link>

        {user && (
          <div className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                location === "/dashboard"
                  ? "bg-secondary text-secondary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/ide"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                location === "/ide"
                  ? "bg-secondary text-secondary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Code2 className="w-4 h-4" />
              IDE
            </Link>
            <Link
              href="/ai"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                location === "/ai"
                  ? "bg-secondary text-secondary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Bot className="w-4 h-4" />
              AI Assistant
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {!user ? (
          <>
            <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/sign-up">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Get Started
              </Button>
            </Link>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt={user.fullName || "User"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">
                    {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="hidden sm:block text-sm">
                <p className="font-medium text-foreground leading-none">{user.username || user.firstName || "User"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user.emailAddresses[0]?.emailAddress}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ redirectUrl: "/" })}
              className="text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
