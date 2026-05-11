import { createFileRoute, Link } from "@tanstack/react-router";
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
import {
  Calendar as CalendarIcon,
  Stethoscope,
  FileText,
  Clock,
} from "lucide-react";
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
  const [doctorId, setDoctorId] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("doctors")
      .select(
        "id, specialization, consultation_fee, profiles:user_id(full_name)",
      )
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
    setLoading(true);
    const { error } = await supabase.from("appointments").insert({
      patient_id: user.id,
      doctor_id: doctorId,
      appointment_date: date,
      time_slot: slot,
      status: "Scheduled",
    });
    setLoading(false);
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
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.profiles?.full_name || d.specialization} —{" "}
                    {d.specialization} ({Number(d.consultation_fee)})
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
                {slots.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    onClick={() => book(s)}
                    disabled={loading}
                  >
                    {s}
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
  const [list, setList] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const load = () => {
    if (!user) return;
    setListLoading(true);
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
        else setList(data ?? []);
      })
      .finally(() => setListLoading(false));
  };

  useEffect(load, [user]);

  const cancel = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "Cancelled" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("✓");
    load();
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {listLoading && (
            <div className="p-8 text-center text-muted-foreground">
              {t("loading")}
            </div>
          )}
          {!listLoading && list.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              {t("none")}
            </div>
          )}
          {list.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-primary/10 grid place-items-center">
                  <Stethoscope className="size-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">
                    {a.doctors?.profiles?.full_name ||
                      a.doctors?.specialization}{" "}
                    — {a.doctors?.specialization}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.appointment_date} • {a.time_slot.slice(0, 5)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={a.status} />
                {a.status === "Scheduled" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancel(a.id)}
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
  const [list, setList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setHistoryLoading(true);
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
        else setList(data ?? []);
      })
      .finally(() => setHistoryLoading(false));
  }, [user]);

  return (
    <div className="space-y-3">
      {historyLoading && (
        <div className="text-center text-muted-foreground py-8">
          {t("loading")}
        </div>
      )}
      {!historyLoading && list.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          {t("none")}
        </div>
      )}
      {list.map((a) => (
        <Card key={a.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-base">
                  {a.doctors?.profiles?.full_name || a.doctors?.specialization}{" "}
                  — {a.doctors?.specialization}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {a.appointment_date} • {a.time_slot.slice(0, 5)}
                </p>
              </div>
              <Badge variant="secondary">✓</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {a.prescriptions?.[0] && (
              <div>
                <div className="font-semibold mb-1">{t("prescription")}</div>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {a.prescriptions[0].medications}
                </p>
                {a.prescriptions[0].notes && (
                  <p className="text-muted-foreground italic mt-1">
                    {a.prescriptions[0].notes}
                  </p>
                )}
              </div>
            )}
            {a.appointment_services?.length > 0 && (
              <div>
                <div className="font-semibold mb-1">{t("bill")}</div>
                <ul className="text-muted-foreground space-y-0.5">
                  {a.appointment_services.map((s: any, i: number) => (
                    <li key={i}>
                      • {s.services?.name} — {Number(s.price_at_time)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
