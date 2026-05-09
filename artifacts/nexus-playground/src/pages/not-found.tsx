import { Link } from "wouter";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 border border-primary/20">
        <Terminal className="w-8 h-8" />
      </div>
      <h1 className="text-6xl font-bold tracking-tight text-foreground mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-foreground mb-2">Signal Not Found</h2>
      <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
        The route you are looking for has been disconnected from the reactive graph. It may have been moved or no longer exists.
      </p>
      <Link href="/">
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-8 h-11">
          Return to Hub
        </Button>
      </Link>
    </div>
  );
}
