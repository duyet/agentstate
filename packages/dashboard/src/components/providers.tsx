import { ClerkProvider } from "@clerk/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

// Keep Clerk's <SignIn/> and <UserButton/> visually aligned with the
// dashboard: shared 9px corner radius and the Hanken Grotesk body font.
const clerkAppearance = {
  variables: {
    borderRadius: "0.5625rem",
    fontFamily: "var(--font-sans)",
  },
};

// Astro exposes public env vars on import.meta.env with a PUBLIC_ prefix
// (replaces Next.js process.env.NEXT_PUBLIC_*).
const publishableKey = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // `.dark` is the single theme mechanism (see tokens.css) — must match the
    // inline theme-script.astro, which toggles the same class before paint.
    // `attribute="class"` keeps next-themes from fighting the inline script
    // by writing a separate data-theme attribute that global.css/tokens.css
    // don't key their color tokens off.
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance}>
        {children}
        <Toaster richColors position="bottom-right" />
      </ClerkProvider>
    </ThemeProvider>
  );
}
