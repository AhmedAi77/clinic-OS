import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { RoleGuard } from "@/components/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Stethoscope, FileText, Clock } from "lucide-react";
import { getAvailableSlots } from "@/lib/clinic";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/patient")({
  head: () => ({ meta: [{ title: "Patient — Viora" }] }),
  component: () => (
    <RoleGuard allow={["patient", "admin"]}>
      <PatientPortal />
    </RoleGuard>
  ),
});

function PatientPortal() {
  const { t } = useI18n();
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">
        {t("patientPortal")}
      </h1>
      <Tabs defaultValue="book">
        <TabsList>
          <TabsTrigger value="book">
            <CalendarIcon className="size-4 me-2" />
            {t("bookAppointment")}
          </TabsTrigger>
          <TabsTrigger value="mine">
            <Clock className="size-4 me-2" />
            {t("myAppointments")}
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="size-4 me-2" />
            {t("myHistory")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="book" className="mt-6">
          <BookAppointment />
        </TabsContent>
        <TabsContent value="mine" className="mt-6">
          <MyAppointments />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <MyHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BookAppointment() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<string[]>([]);
  const [booking, setBooking] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("doctors")
      .select("id, specialization, consultation_fee, profiles:user_id(full_name)")
      .eq("active", true)
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setDoctors(data ?? []);
      });
  }, []);

  useEffect(() => {
    if (!doctorId || !date) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    getAvailableSlots(doctorId, date)
      .then(setSlots)
      .finally(() => setSlotsLoading(false));
  }, [doctorId, date]);

  const book = async (slot: string) => {
    if (!user || !doctorId) return;
    setBooking(true);
    const { error } = await supabase.from("appointments").insert({
      patient_id: user.id,
      doctor_id: doctorId,
      appointment_date: date,
      time_slot: slot,
      status: "Scheduled",
    });
    setBooking(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("bookingSuccess"));
    getAvailableSlots(doctorId, date).then(setSlots);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("bookAppointment")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t("doctor")}
            </label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder={t("doctor")} />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.profiles?.full_name || doctor.specialization} —{" "}
                    {doctor.specialization} ({Number(doctor.consultation_fee)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t("selectDate")}
            </label>
            <Input
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {doctorId && (
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t("selectTime")}
            </label>
            {slotsLoading ? (
              <p className="text-muted-foreground text-sm">{t("loading")}</p>
            ) : slots.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("noSlots")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <Button
                    key={slot}
                    variant="outline"
                    size="sm"
                    onClick={() => book(slot)}
                    disabled={booking}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MyAppointments() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function loadAppointments() {
    if (!user) return;
    setLoading(true);
    supabase
      .from("appointments")
      .select(
        "id, appointment_date, time_slot, status, doctors(specialization, profiles:user_id(full_name))",
      )
      .eq("patient_id", user.id)
      .order("appointment_date", { ascending: false })
      .order("time_slot", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setAppointments(data ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadAppointments, [user]);

  const cancel = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "Cancelled" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Appointment cancelled");
    loadAppointments();
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {loading && (
            <div className="p-8 text-center text-muted-foreground">
              {t("loading")}
            </div>
          )}
          {!loading && appointments.length === 0 && (
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
                <div className="size-10 rounded-xl bg-primary/10 grid place-items-center">
                  <Stethoscope className="size-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">
                    {appt.doctors?.profiles?.full_name ||
                      appt.doctors?.specialization}{" "}
                    — {appt.doctors?.specialization}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {appt.appointment_date} • {appt.time_slot.slice(0, 5)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={appt.status} />
                {appt.status === "Scheduled" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancel(appt.id)}
                  >
                    {t("cancel")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MyHistory() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase
      .from("appointments")
      .select(
        "id, appointment_date, time_slot, doctors(specialization, profiles:user_id(full_name)), prescriptions(medications, notes), appointment_services(price_at_time, services(name))",
      )
      .eq("patient_id", user.id)
      .eq("status", "Completed")
      .order("appointment_date", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        else setRecords(data ?? []);
      })
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="space-y-3">
      {loading && (
        <div className="text-center text-muted-foreground py-8">
          {t("loading")}
        </div>
      )}
      {!loading && records.length === 0 && (
        <div className="text-center text-muted-foreground py-8">{t("none")}</div>
      )}
      {records.map((appt) => (
        <Card key={appt.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base">
                  {appt.doctors?.profiles?.full_name ||
                    appt.doctors?.specialization}{" "}
                  — {appt.doctors?.specialization}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {appt.appointment_date} • {appt.time_slot.slice(0, 5)}
                </p>
              </div>
              <Badge variant="secondary">Completed</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {appt.prescriptions?.[0] && (
              <div>
                <div className="font-semibold mb-1">{t("prescription")}</div>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {appt.prescriptions[0].medications}
                </p>
                {appt.prescriptions[0].notes && (
                  <p className="text-muted-foreground italic mt-1">
                    {appt.prescriptions[0].notes}
                  </p>
                )}
              </div>
            )}
            {appt.appointment_services?.length > 0 && (
              <div>
                <div className="font-semibold mb-1">{t("bill")}</div>
                <ul className="text-muted-foreground space-y-0.5">
                  {appt.appointment_services.map(
                    (item: any, index: number) => (
                      <li key={index}>
                        • {item.services?.name} — {Number(item.price_at_time)}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
