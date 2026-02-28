import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    disabled?: boolean;
  }[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title} disabled={item.disabled}>
              {item.disabled ? (
                <span className="opacity-50 cursor-not-allowed">
                  <item.icon />
                  <span>{item.title}</span>
                </span>
              ) : (
                <Link
                  to={item.url}
                  activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
