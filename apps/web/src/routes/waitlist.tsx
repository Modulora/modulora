import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinWaitlist } from "../lib/waitlist";

export const Route = createFileRoute("/waitlist")({ component: Waitlist });

function Waitlist() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reserved, setReserved] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await joinWaitlist({ data: { username, email } });
      if (result.ok && result.username) {
        setReserved(result.username);
      } else {
        setError(result.error ?? "Something went wrong.");
      }
    } catch {
      setError("Something went wrong. Try again shortly.");
    } finally {
      setPending(false);
    }
  }

  if (reserved) {
    return (
      <div className="mx-auto max-w-md py-16">
        <Card>
          <CardHeader>
            <CardTitle>You're on the list.</CardTitle>
            <CardDescription>
              <span className="text-foreground">@{reserved}</span> is reserved
              for you. We'll email you when Modulora opens.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <Card>
        <CardHeader>
          <CardTitle>Join the waitlist</CardTitle>
          <CardDescription>
            Reserve your creator username before Modulora opens. Usernames are
            2–40 characters: lowercase letters, numbers, and single hyphens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">@</span>
                <Input
                  id="username"
                  name="username"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={40}
                  placeholder="northstar"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Reserving…" : "Reserve username"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Reserving a username holds your creator handle. It doesn't create
              an account, and reservations may be released if unused after
              launch.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
