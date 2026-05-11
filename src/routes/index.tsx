import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Calendar, ClipboardList, Users, Activity } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Viora — Modern Healthcare, Beautifully Simple" },
      {
        name: "description",
        content:
          "Viora connects patients, doctors, and clinics in one seamless, elegant experience.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { t, dir } = useI18n();

  const features = [
    {
      icon: Calendar,
      title: t("bookAppointment"),
      desc: t("featureBookDesc"),
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: Activity,
      title: t("liveQueue"),
      desc: t("featureQueueDesc"),
      color: "text-info",
      bg: "bg-info/10",
    },
    {
      icon: ClipboardList,
      title: t("prescription"),
      desc: t("featurePrescDesc"),
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      icon: Users,
      title: t("manageDoctors"),
      desc: t("featureAdminDesc"),
      color: "text-success",
      bg: "bg-success/10",
    },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 hero-dots" />
        {/* decorative blobs */}
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 size-80 rounded-full bg-white/5 blur-3xl" />

        <div className="relative container mx-auto px-4 py-28 md:py-36 text-center text-primary-foreground">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur border border-white/20 text-xs font-medium mb-8 tracking-wide">
            <span className="size-1.5 rounded-full bg-white/80 animate-pulse" />
            {t("tagline")}
          </span>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
            {t("heroTitle")}
          </h1>

          <p className="mt-6 text-base md:text-lg max-w-xl mx-auto opacity-85 leading-relaxed">
            {t("heroSubtitle")}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="shadow-elegant font-semibold px-8"
            >
              <Link to="/signup">{t("getStarted")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="bg-white/10 backdrop-blur border-white/25 text-primary-foreground hover:bg-white/20 font-semibold px-8"
            >
              <Link to="/login">{t("login")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20" dir={dir}>
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gradient inline-block">
            {t("appName")}
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">{t("tagline")}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className="rounded-2xl border bg-card p-6 shadow-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-1 group"
            >
              <div
                className={`size-12 rounded-xl ${f.bg} grid place-items-center ${f.color} mb-4 transition-transform duration-300 group-hover:scale-110`}
              >
                <f.icon className="size-6" />
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
