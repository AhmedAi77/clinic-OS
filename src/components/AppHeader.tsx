import {
  Link,
  useNavigate,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { LogOut, Globe, ArrowLeft, ArrowRight, Home } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

function VioraLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 7L12 19L20 7"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 7H10L11.5 11L13.5 5L15 7H16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );
}

export function AppHeader() {
  const { t, lang, setLang } = useI18n();
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  const homeForRole = () => {
    switch (role) {
      case "admin":
        return "/admin";
      case "doctor":
        return "/doctor";
      case "receptionist":
        return "/reception";
      case "patient":
        return "/patient";
      default:
        return "/";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-2">
          {!isHome && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.history.back()}
              className="gap-1.5"
              title={t("back")}
            >
              <BackIcon className="size-4" />
              <span className="hidden sm:inline text-xs">{t("back")}</span>
            </Button>
          )}
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid place-items-center size-9 rounded-xl gradient-primary shadow-elegant">
              <VioraLogo className="size-5 text-primary-foreground" />
            </span>
            <span className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-base tracking-wide text-gradient">
                {t("appName")}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                {t("tagline").split(",")[0]}
              </span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {user && !isHome && pathname !== homeForRole() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: homeForRole() })}
              title={t("dashboard")}
            >
              <Home className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="gap-1.5"
          >
            <Globe className="size-4" />
            <span className="text-xs font-semibold">
              {lang === "ar" ? "EN" : "ع"}
            </span>
          </Button>

          {user ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate({ to: homeForRole() })}
              >
                {t("dashboard")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="size-4" />
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => navigate({ to: "/login" })}>
              {t("login")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
