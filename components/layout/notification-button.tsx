"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type NotificationButtonProps = {
  count?: number;
};

export function NotificationButton({ count = 0 }: NotificationButtonProps) {
  return (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {count > 0 ? (
        <Badge className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center px-1 text-[10px]">
          {count > 99 ? "99+" : count}
        </Badge>
      ) : null}
      <span className="sr-only">Notifications</span>
    </Button>
  );
}
