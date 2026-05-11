import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Viora" }] }),
  component: Login,
});

function Login() {
  const { t } = useI18n();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const homeForRole = () => {
    switch (role) {
      case "admin":
        return "/admin" as const;
      case "doctor":
        return "/doctor" as const;
      case "receptionist":
        return "/reception" as const;
      case "patient":
        return "/patient" as const;
      default:
        return "/" as const;
    }
  };

  useEffect(() => {
    if (user && role) navigate({ to: homeForRole() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("✓");
    // navigation handled by useEffect once role loads
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-md">
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="text-2xl">{t("login")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("email")}</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("password")}</Label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("loading") : t("login")}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              <Link to="/signup" className="text-primary hover:underline">
                {t("signup")}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
