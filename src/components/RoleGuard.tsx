import { Navigate } from "@tanstack/react-router";
import { useAuth, type AppRole } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export function RoleGuard({
  allow,
  children,
}: {
  allow: AppRole[];
  children: React.ReactNode;
}) {
  const { user, role, loading } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        {t("loading")}
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (!role || !allow.includes(role)) {
    return (
      <div className="container mx-auto py-20 text-center">
        <h2 className="text-xl font-semibold mb-2">⛔ {t("none")}</h2>
        <p className="text-muted-foreground">Access denied for current role.</p>
      </div>
    );
  }
  return <>{children}</>;
}
