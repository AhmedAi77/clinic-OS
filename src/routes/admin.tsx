import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { RoleGuard } from "@/components/RoleGuard";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Users,
  DollarSign,
  CalendarCheck,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Viora" }] }),
  component: () => (
    <RoleGuard allow={["admin"]}>
      <Admin />
    </RoleGuard>
  ),
});

function Admin() {
  const { t } = useI18n();
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">
        {t("adminDashboard")}
      </h1>
      <Stats />
      <Tabs defaultValue="doctors" className="mt-6">
        <TabsList>
          <TabsTrigger value="doctors">{t("manageDoctors")}</TabsTrigger>
          <TabsTrigger value="services">{t("manageServices")}</TabsTrigger>
          <TabsTrigger value="roles">{t("manageRoles")}</TabsTrigger>
        </TabsList>
        <TabsContent value="doctors" className="mt-6">
          <DoctorsTab />
        </TabsContent>
        <TabsContent value="services" className="mt-6">
          <ServicesTab />
        </TabsContent>
        <TabsContent value="roles" className="mt-6">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatsState {
  revenue: number;
  patients: number;
  appointments: number;
  services: number;
}

function Stats() {
  const { t } = useI18n();
  const [stats, setStats] = useState<StatsState>({
    revenue: 0,
    patients: 0,
    appointments: 0,
    services: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      const monthStart = new Date().toISOString().slice(0, 7) + "-01";
      const { data: completed } = await supabase
        .from("appointments")
        .select(
          "id, doctors(consultation_fee), appointment_services(price_at_time)",
        )
        .eq("status", "Completed")
        .gte("appointment_date", monthStart);

      const revenue = (completed ?? []).reduce((sum: number, appt: any) => {
        const fee = Number(appt.doctors?.consultation_fee ?? 0);
        const extras = (appt.appointment_services ?? []).reduce(
          (x: number, svc: any) => x + Number(svc.price_at_time),
          0,
        );
        return sum + fee + extras;
      }, 0);

      const { count: patients } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "patient");
      const { count: appointments } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true });
      const { count: services } = await supabase
        .from("services")
        .select("*", { count: "exact", head: true });

      setStats({
        revenue,
        patients: patients ?? 0,
        appointments: appointments ?? 0,
        services: services ?? 0,
      });
    }

    fetchStats();
  }, []);

  const cards = [
    {
      label: t("totalRevenue"),
      value: stats.revenue.toFixed(2),
      icon: DollarSign,
      color: "text-success",
    },
    {
      label: t("totalPatients"),
      value: stats.patients,
      icon: Users,
      color: "text-info",
    },
    {
      label: t("totalAppointments"),
      value: stats.appointments,
      icon: CalendarCheck,
      color: "text-primary",
    },
    {
      label: t("servicesCount"),
      value: stats.services,
      icon: Stethoscope,
      color: "text-accent",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  {card.label}
                </p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
              <div
                className={`size-10 rounded-xl bg-secondary grid place-items-center ${card.color}`}
              >
                <card.icon className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const defaultDoctorForm = {
  user_id: "",
  specialization: "",
  consultation_fee: "100",
  working_hours_start: "09:00",
  working_hours_end: "17:00",
  slot_duration_minutes: "30",
};

function DoctorsTab() {
  const { t } = useI18n();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultDoctorForm);

  function loadDoctors() {
    supabase
      .from("doctors")
      .select("*, profiles:user_id(full_name)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setDoctors(data ?? []));
  }

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name")
      .limit(200)
      .then(({ data }) => setProfiles(data ?? []));
  }, [open]);

  const create = async () => {
    if (!form.user_id || !form.specialization) {
      toast.error("Please fill in all required fields");
      return;
    }
    const { error } = await supabase.from("doctors").insert({
      user_id: form.user_id,
      specialization: form.specialization,
      consultation_fee: Number(form.consultation_fee),
      working_hours_start: form.working_hours_start,
      working_hours_end: form.working_hours_end,
      slot_duration_minutes: Number(form.slot_duration_minutes),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase
      .from("user_roles")
      .insert({ user_id: form.user_id, role: "doctor" });
    toast.success("Doctor added");
    setOpen(false);
    setForm(defaultDoctorForm);
    loadDoctors();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("doctors")
      .delete()
      .eq("id", deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Doctor removed");
      loadDoctors();
    }
    setDeleteId(null);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t("manageDoctors")}</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4 me-1" />
              {t("add")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("add")} {t("doctor")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>User</Label>
                <Select
                  value={form.user_id}
                  onValueChange={(v) => setForm({ ...form, user_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.full_name || profile.id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("specialization")}</Label>
                <Input
                  value={form.specialization}
                  onChange={(e) =>
                    setForm({ ...form, specialization: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t("consultationFee")}</Label>
                <Input
                  type="number"
                  value={form.consultation_fee}
                  onChange={(e) =>
                    setForm({ ...form, consultation_fee: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>From</Label>
                  <Input
                    type="time"
                    value={form.working_hours_start}
                    onChange={(e) =>
                      setForm({ ...form, working_hours_start: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>To</Label>
                  <Input
                    type="time"
                    value={form.working_hours_end}
                    onChange={(e) =>
                      setForm({ ...form, working_hours_end: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Slot (min)</Label>
                  <Input
                    type="number"
                    value={form.slot_duration_minutes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        slot_duration_minutes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create}>{t("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {doctors.map((doctor) => (
            <div
              key={doctor.id}
              className="flex items-center justify-between p-4"
            >
              <div>
                <div className="font-medium">
                  {doctor.profiles?.full_name || "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {doctor.specialization} • {Number(doctor.consultation_fee)} •{" "}
                  {doctor.working_hours_start.slice(0, 5)}–
                  {doctor.working_hours_end.slice(0, 5)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteId(doctor.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove doctor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the doctor profile and cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ServicesTab() {
  const { t } = useI18n();
  const [services, setServices] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", price: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function loadServices() {
    supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setServices(data ?? []));
  }

  useEffect(() => {
    loadServices();
  }, []);

  const add = async () => {
    if (!form.name || !form.price) return;
    const { error } = await supabase
      .from("services")
      .insert({ name: form.name, price: Number(form.price) });
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm({ name: "", price: "" });
    loadServices();
  };

  const remove = async () => {
    if (!deleteId) return;
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", deleteId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Service removed");
      loadServices();
    }
    setDeleteId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("manageServices")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder={t("serviceName")}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            type="number"
            placeholder={t("servicePrice")}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="w-32"
          />
          <Button onClick={add}>
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="divide-y border rounded-lg">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between p-3"
            >
              <div>
                <div className="font-medium">{service.name}</div>
                <div className="text-xs text-muted-foreground">
                  {Number(service.price)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteId(service.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove service?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the service and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={remove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function RolesTab() {
  const { t } = useI18n();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roleMap, setRoleMap] = useState<Record<string, string[]>>({});
  const [revokeTarget, setRevokeTarget] = useState<{
    userId: string;
    role: string;
  } | null>(null);

  async function loadRoles() {
    const { data: users } = await supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name")
      .limit(200);
    setProfiles(users ?? []);

    const { data: rows } = await supabase
      .from("user_roles")
      .select("user_id, role");
    const map: Record<string, string[]> = {};
    (rows ?? []).forEach((row: any) => {
      (map[row.user_id] = map[row.user_id] || []).push(row.role);
    });
    setRoleMap(map);
  }

  useEffect(() => {
    loadRoles();
  }, []);

  const assign = async (
    userId: string,
    role: "admin" | "doctor" | "receptionist" | "patient",
  ) => {
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Role assigned");
    loadRoles();
  };

  const revoke = async () => {
    if (!revokeTarget) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", revokeTarget.userId)
      .eq("role", revokeTarget.role);
    if (error) {
      toast.error(error.message);
    } else {
      loadRoles();
    }
    setRevokeTarget(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("manageRoles")}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <div className="font-medium">
                  {profile.full_name || profile.id.slice(0, 8)}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(roleMap[profile.id] || []).map((role) => (
                    <button
                      key={role}
                      onClick={() =>
                        setRevokeTarget({ userId: profile.id, role })
                      }
                      className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full hover:bg-destructive/15 hover:text-destructive"
                    >
                      {role} ✕
                    </button>
                  ))}
                </div>
              </div>
              <Select onValueChange={(v) => assign(profile.id, v as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t("assignRole")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </CardContent>
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the <strong>{revokeTarget?.role}</strong> role
              from this user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={revoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
