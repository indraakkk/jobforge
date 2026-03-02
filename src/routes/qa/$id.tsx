import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/qa/$id")({
  component: () => <Outlet />,
});
