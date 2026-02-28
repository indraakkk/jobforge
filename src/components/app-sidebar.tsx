import {
  Briefcase,
  FileText,
  Hammer,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import type * as React from "react";

import { NavMain } from "@/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Applications",
    url: "/applications",
    icon: Briefcase,
  },
  {
    title: "Q&A Vault",
    url: "/qa",
    icon: MessageSquare,
    disabled: true,
  },
  {
    title: "CV Manager",
    url: "/cv",
    icon: FileText,
    disabled: true,
  },
  {
    title: "AI Tailor",
    url: "/ai",
    icon: Sparkles,
    disabled: true,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Hammer className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">JobForge</span>
                  <span className="truncate text-xs">Job Hunting Toolkit</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
