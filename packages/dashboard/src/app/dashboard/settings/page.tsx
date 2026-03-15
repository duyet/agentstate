"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-foreground mb-1">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your account and preferences.
        </p>
      </div>

      {/* Account section */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-4">Account</h2>
        <div className="rounded-lg border border-border/40 bg-card divide-y divide-border/40">
          <div className="p-5">
            <label className="text-xs font-mono text-muted-foreground block mb-2">
              Email
            </label>
            <Input
              disabled
              value="user@example.com"
              className="font-mono text-sm max-w-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Sign in with Clerk — coming in Stage 4.
            </p>
          </div>
        </div>
      </section>

      <Separator className="my-8 bg-border/40" />

      {/* Danger zone */}
      <section>
        <h2 className="text-sm font-semibold text-red-400/80 mb-4">
          Danger Zone
        </h2>
        <div className="rounded-lg border border-red-400/20 bg-card p-5">
          <p className="text-sm text-foreground mb-1">Delete account</p>
          <p className="text-xs text-muted-foreground mb-4">
            Permanently delete your account and all projects. This action cannot
            be undone.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs border-red-400/30 text-red-400/80 hover:bg-red-400/10"
            disabled
          >
            Delete Account
          </Button>
        </div>
      </section>
    </div>
  );
}
