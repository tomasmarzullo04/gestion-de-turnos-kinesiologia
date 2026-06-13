"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import { logoutAction } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

interface UserMenuProps {
  name: string;
  email: string;
  /** Ruta al perfil según el rol (ej. /portal/perfil). Opcional. */
  profileHref?: string;
}

export function UserMenu({ name, email, profileHref }: UserMenuProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 gap-2 px-2"
          aria-label="Menú de usuario"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">
            {name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate">{name}</span>
          <span className="truncate text-xs font-normal text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {profileHref && (
          <DropdownMenuItem asChild>
            <Link href={profileHref}>
              <UserIcon className="h-4 w-4" />
              Mi perfil
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={isPending}
          onSelect={(event) => {
            event.preventDefault();
            startTransition(() => {
              void logoutAction();
            });
          }}
        >
          <LogOut className="h-4 w-4" />
          {isPending ? "Cerrando…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
