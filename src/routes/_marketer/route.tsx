import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_marketer")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/marketer-portal" });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);

    const isMarketer = (roles ?? []).some((r) => r.role === "marketer");
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isMarketer && !isAdmin) throw redirect({ to: "/dashboard" });

    return { user: data.user, isAdminView: isAdmin && !isMarketer };
  },
  component: () => <Outlet />,
});

