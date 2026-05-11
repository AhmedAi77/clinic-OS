import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Stethoscope, Plus, Pill } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/doctor")({
  head: () => ({ meta: [{ title: "Doctor — Viora" }] }),
  component: () => (
    <RoleGuard allow={["doctor", "admin"]}>
      <DoctorDashboard />
    </RoleGuard>
  ),
});

function DoctorDashboard() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [queue, setQueue] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("doctors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setDoctorId(data?.id ?? null);
      })
      .finally(() => setDoctorLoading(false));
  }, [user]);

  const load = () => {
    if (!doctorId) return;
    supabase
      .from("appointments")
      .select(
        "id, time_slot, status, profiles!appointments_patient_id_fkey(full_name, phone)",
      )
      .eq("doctor_id", doctorId)
      .in("status", ["Waiting", "InConsultation"])
      .eq("appointment_date", new Date().toISOString().slice(0, 10))
      .order("time_slot", { ascending: true })
      .then(({ data }) => setQueue(data ?? []));
  };

  useEffect(() => {
    if (!doctorId) return;
    load();
    const ch = supabase
      .channel("doctor-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [doctorId]);

  if (doctorLoading) {
    return (
      <div className="container mx-auto p-8 text-center text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (!doctorId) {
    return (
      <div className="container mx-auto p-8 text-center text-muted-foreground">
        No doctor profile linked to your account.
      </div>
    );
  }

  const setStatus = async (
    id: string,
    status:
      | "Waiting"
      | "InConsultation"
      | "PendingPayment"
      | "Completed"
      | "Cancelled"
      | "Scheduled",
  ) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("✓");
    load();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">{t("liveQueue")}</h1>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {queue.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                {t("none")}
              </div>
            )}
            {queue.map((a, idx) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl gradient-primary grid place-items-center font-bold text-primary-foreground">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-medium">{a.profiles?.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.time_slot.slice(0, 5)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.status} />
                  {a.status === "Waiting" && (
                    <Button
                      size="sm"
                      onClick={() => setStatus(a.id, "InConsultation")}
                    >
                      <Stethoscope className="size-4 me-1" />
                      {t("startConsultation")}
                    </Button>
                  )}
                  {a.status === "InConsultation" && (
                    <ConsultationPanel
                      apptId={a.id}
                      onFinish={() => setStatus(a.id, "PendingPayment")}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConsultationPanel({
  apptId,
  onFinish,
}: {
  apptId: string;
  onFinish: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [added, setAdded] = useState<any[]>([]);
  const [serviceId, setServiceId] = useState("");
  const [meds, setMeds] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .then(({ data }) => setServices(data ?? []));
    supabase
      .from("appointment_services")
      .select("id, price_at_time, services(name)")
      .eq("appointment_id", apptId)
      .then(({ data }) => setAdded(data ?? []));
    supabase
      .from("prescriptions")
      .select("medications, notes")
      .eq("appointment_id", apptId)
      .maybeSingle()
      .then(({ data }) => {
        setMeds(data?.medications ?? "");
        setNotes(data?.notes ?? "");
      });
  }, [open, apptId]);

  const addService = async () => {
    if (!serviceId) return;
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    const { error } = await supabase.from("appointment_services").insert({
      appointment_id: apptId,
      service_id: serviceId,
      price_at_time: svc.price,
    });
    if (error) return toast.error(error.message);
    setServiceId("");
    supabase
      .from("appointment_services")
      .select("id, price_at_time, services(name)")
      .eq("appointment_id", apptId)
      .then(({ data }) => setAdded(data ?? []));
  };

  const removeService = async (id: string) => {
    const { error } = await supabase
      .from("appointment_services")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAdded(added.filter((a) => a.id !== id));
  };

  const finish = async () => {
    const { error } = await supabase
      .from("prescriptions")
      .upsert(
        { appointment_id: apptId, medications: meds, notes },
        { onConflict: "appointment_id" },
      );
    if (error) {
      toast.error(error.message);
      return;
    }
    onFinish();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default">
          <Pill className="size-4 me-1" />
          {t("finishConsultation")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("startConsultation")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t("addService")}</Label>
            <div className="flex gap-2 mt-1">
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("addService")} />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {Number(s.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addService} variant="outline">
                <Plus className="size-4" />
              </Button>
            </div>
            {added.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {added.map((a) => (
                  <li
                    key={a.id}
                    className="flex justify-between bg-secondary rounded px-3 py-1.5"
                  >
                    <span>
                      {a.services?.name} — {Number(a.price_at_time)}
                    </span>
                    <button
                      onClick={() => removeService(a.id)}
                      className="text-destructive text-xs"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <Label>{t("medications")}</Label>
            <Textarea
              value={meds}
              onChange={(e) => setMeds(e.target.value)}
              rows={3}
              placeholder="Paracetamol 500mg x 3 days..."
            />
          </div>
          <div>
            <Label>{t("notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={finish}>{t("finishConsultation")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
