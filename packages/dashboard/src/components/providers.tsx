import { ClerkProvider } from "@clerk/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

// Keep Clerk's <SignIn/> and <UserButton/> aligned with the applied preset.
const clerkAppearance = {
  variables: {
    borderRadius: "0",
    fontFamily: "var(--font-mono)",
    colorPrimary: "var(--primary)",
  },
};

// Astro exposes public env vars on import.meta.env with a PUBLIC_ prefix
// (replaces Next.js process.env.NEXT_PUBLIC_*).
const publishableKey = import.meta.env.PUBLIC_CLERK_PUBLISHABLE_KEY;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // `.dark` / `.light` on <html> drive tokens.css. Dark tokens also live on
    // `:root` so a missing class still paints the terminal canvas.
    // `attribute="class"` with explicit dark/light values keeps next-themes
    // from falling back to "system" (which used to resolve to light).
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      value={{ dark: "dark", light: "light" }}
    >
      <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance}>
        {children}
        <Toaster
          richColors
          position="bottom-right"
          toastOptions={{ className: "rounded-none font-mono" }}
        />
      </ClerkProvider>
    </ThemeProvider>
  );
}
