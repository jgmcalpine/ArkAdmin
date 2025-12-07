"use client"

import { useState, type ReactNode } from "react"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { MainNav } from "./main-nav"
import { ModeToggle } from "@/components/mode-toggle"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleMobileLinkClick = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r">
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex h-10 items-center px-2">
            <h1 className="text-lg font-semibold">Ark Admin</h1>
          </div>
          <Separator />
          <MainNav />
          <div className="mt-auto flex items-center justify-between border-t p-4">
            {/* Left Side: User Info */}
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">My Wallet</span>
                <span className="text-xs text-muted-foreground">Signet</span>
              </div>
            </div>
            {/* Right Side: Toggle */}
            <ModeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-14 items-center gap-4 border-b px-4 md:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="size-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Mobile Navigation Menu</SheetTitle>
              </SheetHeader>
              <div className="flex h-full flex-col gap-4 p-4">
                <div className="flex h-10 items-center px-2">
                  <h1 className="text-lg font-semibold">Ark Admin</h1>
                </div>
                <Separator />
                <MainNav onLinkClick={handleMobileLinkClick} />
                <div className="mt-auto border-t p-4">
                  {/* User Info */}
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">My Wallet</span>
                      <span className="text-xs text-muted-foreground">Signet</span>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-lg font-semibold">Ark Admin</h1>
            <ModeToggle />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}

