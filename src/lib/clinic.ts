import { supabase } from "@/integrations/supabase/client";

export function generateSlots(
  start: string,
  end: string,
  durationMin: number,
): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let cur = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  while (cur + durationMin <= endTotal) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    cur += durationMin;
  }
  return slots;
}

export async function getAvailableSlots(doctorId: string, date: string) {
  const { data: doctor } = await supabase
    .from("doctors")
    .select("working_hours_start, working_hours_end, slot_duration_minutes")
    .eq("id", doctorId)
    .maybeSingle();
  if (!doctor) return [];
  const all = generateSlots(
    doctor.working_hours_start.slice(0, 5),
    doctor.working_hours_end.slice(0, 5),
    doctor.slot_duration_minutes,
  );
  const { data: booked } = await supabase
    .from("appointments")
    .select("time_slot, status")
    .eq("doctor_id", doctorId)
    .eq("appointment_date", date)
    .neq("status", "Cancelled");
  const taken = new Set((booked ?? []).map((b) => b.time_slot.slice(0, 5)));
  return all.filter((s) => !taken.has(s));
}

export async function calcBill(appointmentId: string) {
  const { data: appt } = await supabase
    .from("appointments")
    .select("doctor_id, doctors(consultation_fee)")
    .eq("id", appointmentId)
    .maybeSingle();
  const fee = Number((appt as any)?.doctors?.consultation_fee ?? 0);
  const { data: items } = await supabase
    .from("appointment_services")
    .select("price_at_time, services(name)")
    .eq("appointment_id", appointmentId);
  const services = (items ?? []).map((it: any) => ({
    name: it.services?.name ?? "—",
    price: Number(it.price_at_time),
  }));
  const total = fee + services.reduce((s, it) => s + it.price, 0);
  return { consultationFee: fee, services, total };
}
