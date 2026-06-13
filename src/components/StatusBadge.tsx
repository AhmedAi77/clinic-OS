import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AppointmentStatus as Status } from "@/types";

const styles: Record<Status, string> = {
  Scheduled: "bg-info/15 text-info border-info/30",
  Waiting: "bg-accent/20 text-accent-foreground border-accent/40",
  InConsultation: "bg-primary/15 text-primary border-primary/30",
  PendingPayment: "bg-warning/20 text-warning-foreground border-warning/40",
  Completed: "bg-success/15 text-success border-success/30",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useI18n();
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border",
        styles[status],
      )}
    >
      {t(status)}
    </span>
  );
}
