import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
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
import type { AppointmentStatus } from "@/types";

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

  function loadQueue(id: string) {
    supabase
      .from("appointments")
      .select(
        "id, time_slot, status, profiles!appointments_patient_id_fkey(full_name, phone)",
      )
      .eq("doctor_id", id)
      .in("status", ["Waiting", "InConsultation"])
      .eq("appointment_date", new Date().toISOString().slice(0, 10))
      .order("time_slot", { ascending: true })
      .then(({ data }) => setQueue(data ?? []));
  }

  useEffect(() => {
    if (!doctorId) return;
    loadQueue(doctorId);
    const channel = supabase
      .channel("doctor-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => loadQueue(doctorId),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
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

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    loadQueue(doctorId);
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
            {queue.map((appt, position) => (
              <div
                key={appt.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl gradient-primary grid place-items-center font-bold text-primary-foreground">
                    {position + 1}
                  </div>
                  <div>
                    <div className="font-medium">{appt.profiles?.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {appt.time_slot.slice(0, 5)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={appt.status} />
                  {appt.status === "Waiting" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(appt.id, "InConsultation")}
                    >
                      <Stethoscope className="size-4 me-1" />
                      {t("startConsultation")}
                    </Button>
                  )}
                  {appt.status === "InConsultation" && (
                    <ConsultationPanel
                      apptId={appt.id}
                      onFinish={() => updateStatus(appt.id, "PendingPayment")}
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
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [addedServices, setAddedServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [medications, setMedications] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;

    supabase
      .from("services")
      .select("*")
      .eq("active", true)
      .then(({ data }) => setAvailableServices(data ?? []));

    supabase
      .from("appointment_services")
      .select("id, price_at_time, services(name)")
      .eq("appointment_id", apptId)
      .then(({ data }) => setAddedServices(data ?? []));

    supabase
      .from("prescriptions")
      .select("medications, notes")
      .eq("appointment_id", apptId)
      .maybeSingle()
      .then(({ data }) => {
        setMedications(data?.medications ?? "");
        setNotes(data?.notes ?? "");
      });
  }, [open, apptId]);

  const addService = async () => {
    if (!selectedServiceId) return;
    const service = availableServices.find((s) => s.id === selectedServiceId);
    if (!service) return;
    const { error } = await supabase.from("appointment_services").insert({
      appointment_id: apptId,
      service_id: selectedServiceId,
      price_at_time: service.price,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSelectedServiceId("");
    supabase
      .from("appointment_services")
      .select("id, price_at_time, services(name)")
      .eq("appointment_id", apptId)
      .then(({ data }) => setAddedServices(data ?? []));
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
    setAddedServices(addedServices.filter((s) => s.id !== id));
  };

  const finish = async () => {
    const { error } = await supabase.from("prescriptions").upsert(
      { appointment_id: apptId, medications, notes },
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
              <Select
                value={selectedServiceId}
                onValueChange={setSelectedServiceId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("addService")} />
                </SelectTrigger>
                <SelectContent>
                  {availableServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name} — {Number(service.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={addService} variant="outline">
                <Plus className="size-4" />
              </Button>
            </div>
            {addedServices.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {addedServices.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between bg-secondary rounded px-3 py-1.5"
                  >
                    <span>
                      {item.services?.name} — {Number(item.price_at_time)}
                    </span>
                    <button
                      onClick={() => removeService(item.id)}
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
              value={medications}
              onChange={(e) => setMedications(e.target.value)}
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
