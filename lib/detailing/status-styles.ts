import type { DetailingOrderStatus } from "@/lib/constants/detailing";

export const DETAILING_STATUS_STYLES: Record<DetailingOrderStatus, string> = {
  scheduled: "border-blue-600/30 bg-blue-600/10 text-blue-300",
  in_progress: "border-yellow-600/30 bg-yellow-600/10 text-yellow-300",
  ready: "border-emerald-600/30 bg-emerald-600/10 text-emerald-300",
  delivered: "border-green-600/30 bg-green-600/10 text-green-400",
  cancelled: "border-zinc-600/30 bg-zinc-800 text-zinc-400",
};

export const DETAILING_STATUS_NEXT: Partial<
  Record<DetailingOrderStatus, DetailingOrderStatus>
> = {
  scheduled: "in_progress",
  in_progress: "ready",
  ready: "delivered",
};
