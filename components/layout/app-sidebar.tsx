"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-sm font-bold text-white">
        R
      </div>
      <div>
        <p className="text-sm font-semibold text-white">RemAuto</p>
        <p className="text-xs text-zinc-500">CRM Platform</p>
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 lg:fixed lg:flex">
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard">
          <Brand />
        </Link>
      </div>
      <Separator />
      <SidebarNav />
    </aside>
  );
}

export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <div className="flex h-16 items-center px-6">
          <Brand />
        </div>
        <Separator />
        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
