import type { Config } from "tailwindcss";

export default {
  /* `darkMode: ["class"]` was declared here but there is no .dark token block
     in index.css and nothing in the UI ever sets the class, so dark mode has
     never been able to render. The 17 stray `dark:` utilities that had been
     written against it have been removed; keeping the config flag would only
     invite more. Re-add this along with a real .dark token block if dark mode
     is ever actually built. */
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        "persian-blue": {
          50: "hsl(var(--persian-blue-50))",
          100: "hsl(var(--persian-blue-100))",
          200: "hsl(var(--persian-blue-200))",
          300: "hsl(var(--persian-blue-300))",
          400: "hsl(var(--persian-blue-400))",
          500: "hsl(var(--persian-blue-500))",
          600: "hsl(var(--persian-blue-600))",
          700: "hsl(var(--persian-blue-700))",
          800: "hsl(var(--persian-blue-800))",
          900: "hsl(var(--persian-blue-900))",
        },
        /* ─────────────────────────────────────────────────────────────────
           These MUST be wrapped in hsl().

           The tokens are declared in client/src/index.css as bare HSL
           triplets (e.g. `--card: 0 0% 100%`), which is the shadcn
           convention — it lets utilities compose opacity as
           `hsl(var(--card) / 0.5)`. Mapping them here as a bare
           `var(--card)` emitted `background-color: 0 0% 100%`, which is
           invalid CSS, so every one of these utilities was a silent no-op.

           Concretely, that meant <Card> ("border bg-card") rendered
           transparent with a currentColor border, and <Button
           variant="outline"|"secondary"|"destructive"> had no background at
           all. The persian-blue scale above always did this correctly,
           which is why that ramp was the only one that worked.

           If you add a token here, wrap it. If a colour ever looks like it
           "isn't applying", check this first.
           ───────────────────────────────────────────────────────────────── */
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        paper: {
          DEFAULT: "hsl(var(--paper))",
          foreground: "hsl(var(--paper-foreground))",
        },
        /* Aliases matching Lovable's exact class names 1:1 (bg-ink, text-ink,
           bg-credit, border-rule, ...) so component code ported from there
           needs no manual className translation — just point at the same
           tokens this file already wires: --primary is the exact ink value,
           --success-green the exact credit value, --border the exact rule
           value (see index.css, 2026-09-04 "Warm Ledger" port). */
        ink: "hsl(var(--primary))",
        credit: "hsl(var(--success-green))",
        debit: "hsl(var(--destructive))",
        rule: "hsl(var(--border))",
        notice: "hsl(var(--warning-orange))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        /* chart-* and sidebar-* are unwired shadcn scaffold: the --chart-N and
           --sidebar-* custom properties they point at are not declared
           anywhere in index.css, and no component uses these utilities. They
           were left as bare var() during the hsl() pass above — which, since
           the source variables don't exist either way, changed nothing in
           practice, but it contradicted the rule stated above and would have
           produced the same invisible-utility bug the moment someone declared
           the missing variables without noticing this block. Wrapped for
           consistency; still fully inert until both sides are wired up. */
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
