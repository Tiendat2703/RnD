// lib/utils.ts — tiện ích chung (vd: cn() để ghép className cho shadcn/ui)
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
