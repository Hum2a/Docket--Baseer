import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { BoardPage } from "@/routes/board";
import { ListPage } from "@/routes/list";
import { StatsPage } from "@/routes/stats";
import { SettingsPage } from "@/routes/settings";
import { ApplicationPage } from "@/routes/application";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});

const boardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: BoardPage,
});

const listRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/list",
  component: ListPage,
});

const statsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/stats",
  component: StatsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/settings",
  component: SettingsPage,
});

const applicationRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/applications/$id",
  component: function ApplicationRoute() {
    const { id } = applicationRoute.useParams();
    return <ApplicationPage id={id} />;
  },
});

const routeTree = rootRoute.addChildren([
  appRoute.addChildren([
    boardRoute,
    listRoute,
    statsRoute,
    settingsRoute,
    applicationRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
