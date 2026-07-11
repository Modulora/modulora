import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="flex flex-col items-center gap-6 py-20 text-center">
      <h1 className="max-w-2xl text-5xl font-bold tracking-tight">
        Discover your next great component.
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground">
        Browse open and premium components from trusted creators. Install with
        one command—or let your coding agent handle it.
      </p>
      <div className="flex gap-4">
        <Button asChild size="lg">
          <Link to="/components">Explore components</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href="https://github.com/Modulora" rel="noreferrer">
            Publish a component
          </a>
        </Button>
      </div>
    </div>
  );
}
