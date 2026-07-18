import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { authClient } from "@/lib/auth-client";
import { BoardPage } from "@/routes/board";
import { ListPage } from "@/routes/list";
import { StatsPage } from "@/routes/stats";
import { SettingsPage } from "@/routes/settings";
import { ApplicationPage } from "@/routes/application";
import { LoginPage } from "@/routes/login";

async function requireAuth() {
  const session = await authClient.getSession();
  if (!session.data?.user) {
    throw redirect({ to: "/login" });
  }
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: requireAuth,
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
  loginRoute,
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
