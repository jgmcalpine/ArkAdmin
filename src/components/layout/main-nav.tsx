"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Coins,
  Store,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/coins",
    label: "Coins",
    icon: Coins,
  },
]

interface MainNavProps {
  className?: string
  onLinkClick?: () => void
}

export function MainNav({ className, onLinkClick }: MainNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn("flex flex-col gap-1", className)}>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="size-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
      <Separator className="my-2" />
      <Link
        href="/pos"
        target="_blank"
        onClick={onLinkClick}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Store className="size-4" />
        <span>Launch POS</span>
      </Link>
    </nav>
  )
}

