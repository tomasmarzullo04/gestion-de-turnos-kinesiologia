"use client";

import { Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SubmitButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

/** Botón de envío con estado de carga (spinner + texto opcional). */
export function SubmitButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={loading || disabled}
      className={cn(className)}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {loading && loadingText ? loadingText : children}
    </Button>
  );
}
