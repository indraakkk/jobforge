import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFound,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "JobForge" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
});

function RootComponent() {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              JobForge
            </span>
          </header>
          <main className="flex-1 p-4">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-6xl font-bold text-muted-foreground/30">404</p>
      <p className="mt-4 text-lg font-medium text-foreground">Page not found</p>
      <p className="mt-1 text-sm text-muted-foreground">
        The page you're looking for doesn't exist.
      </p>
      <Link
        to="/"
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
