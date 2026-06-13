import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { RoleGuard } from "@/components/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { calcBill, getAvailableSlots } from "@/lib/clinic";
import { CheckCircle2, UserPlus, Receipt } from "lucide-react";
import type { AppointmentStatus } from "@/types";

export const Route = createFileRoute("/reception")({
  head: () => ({ meta: [{ title: "Reception — Viora" }] }),
  component: () => (
    <RoleGuard allow={["receptionist", "admin"]}>
      <Reception />
    </RoleGuard>
  ),
});

function Reception() {
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const [appointments, setAppointments] = useState<any[]>([]);

  function loadAppointments() {
    supabase
      .from("appointments")
      .select(
        "id, appointment_date, time_slot, status, walk_in, patient_id, doctor_id, doctors(specialization, consultation_fee, profiles:user_id(full_name)), profiles!appointments_patient_id_fkey(full_name, phone)",
      )
      .eq("appointment_date", today)
      .order("time_slot", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setAppointments(data ?? []);
      });
  }

  useEffect(() => {
    loadAppointments();
    const channel = supabase
      .channel("reception-appts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => loadAppointments(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);
    if (error) toast.error(error.message);
  };

  const pendingPayment = appointments.filter(
    (a) => a.status === "PendingPayment",
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">
          {t("receptionDashboard")}
        </h1>
        <WalkInDialog onCreated={loadAppointments} />
      </div>

      {pendingPayment.length > 0 && (
        <Card className="mb-6 border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="size-4" />
              {t("collectPayment")} ({pendingPayment.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingPayment.map((appt) => (
              <BillRow key={appt.id} appt={appt} onPaid={loadAppointments} />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("todayAppointments")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {appointments.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                {t("none")}
              </div>
            )}
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-secondary grid place-items-center font-semibold text-secondary-foreground text-sm">
                    {appt.time_slot.slice(0, 5)}
                  </div>
                  <div>
                    <div className="font-medium">
                      {appt.profiles?.full_name || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {appt.doctors?.profiles?.full_name} —{" "}
                      {appt.doctors?.specialization}
                      {appt.walk_in && (
                        <span className="ms-2 text-accent-foreground bg-accent/30 px-1.5 py-0.5 rounded">
                          walk-in
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={appt.status} />
                  {appt.status === "Scheduled" && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(appt.id, "Waiting")}
                    >
                      <CheckCircle2 className="size-4 me-1" />
                      {t("checkIn")}
                    </Button>
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

function BillRow({ appt, onPaid }: { appt: any; onPaid: () => void }) {
  const { t } = useI18n();
  const [bill, setBill] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const viewBill = async () => {
    const result = await calcBill(appt.id);
    setBill(result);
    setOpen(true);
  };

  const collectPayment = async () => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "Completed" })
      .eq("id", appt.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    toast.success("Payment collected");
    onPaid();
  };

  return (
    <div className="flex items-center justify-between bg-card rounded-lg p-3 border">
      <div>
        <div className="font-medium text-sm">{appt.profiles?.full_name}</div>
        <div className="text-xs text-muted-foreground">
          {appt.doctors?.profiles?.full_name}
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="default" onClick={viewBill}>
            <Receipt className="size-4 me-1" />
            {t("bill")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("bill")} — {appt.profiles?.full_name}
            </DialogTitle>
          </DialogHeader>
          {bill && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t("consultationFee")}</span>
                <span className="font-mono">
                  {bill.consultationFee.toFixed(2)}
                </span>
              </div>
              {bill.services.map((service: any, i: number) => (
                <div
                  key={i}
                  className="flex justify-between text-muted-foreground"
                >
                  <span>{service.name}</span>
                  <span className="font-mono">{service.price.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between text-base font-bold">
                <span>{t("total")}</span>
                <span className="font-mono text-primary">
                  {bill.total.toFixed(2)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={collectPayment}>
              <CheckCircle2 className="size-4 me-1" />
              {t("collectPayment")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WalkInDialog({ onCreated }: { onCreated: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("doctors")
      .select("id, specialization, profiles:user_id(full_name)")
      .eq("active", true)
      .then(({ data }) => setDoctors(data ?? []));
    supabase
      .from("profiles")
      .select("id, full_name, phone")
      .order("full_name")
      .limit(200)
      .then(({ data }) => setPatients(data ?? []));
  }, [open]);

  useEffect(() => {
    if (doctorId) getAvailableSlots(doctorId, today).then(setSlots);
  }, [doctorId]);

  const create = async () => {
    if (!doctorId || !patientId || !slot) {
      toast.error("Please fill in all fields");
      return;
    }
    const { error } = await supabase.from("appointments").insert({
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_date: today,
      time_slot: slot,
      status: "Waiting",
      walk_in: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Walk-in registered");
    setOpen(false);
    setDoctorId("");
    setPatientId("");
    setSlot("");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4 me-1" />
          {t("walkIn")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("walkIn")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("patient")}</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue placeholder={t("patient")} />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.full_name || patient.phone || patient.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("doctor")}</Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder={t("doctor")} />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.profiles?.full_name} — {doctor.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {doctorId && (
            <div>
              <Label>{t("selectTime")}</Label>
              <Select value={slot} onValueChange={setSlot}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectTime")} />
                </SelectTrigger>
                <SelectContent>
                  {slots.map((timeSlot) => (
                    <SelectItem key={timeSlot} value={timeSlot}>
                      {timeSlot}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={create}>{t("add")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
