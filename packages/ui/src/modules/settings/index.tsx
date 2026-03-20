"use client";

import { invoke } from "@tauri-apps/api/core";
import { Bell, FileText, Monitor, Trash2 } from "lucide-react";
import { CardError } from "@/components/card-error";
import { CardLoading } from "@/components/card-loading";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { NotificationSettings, UninstallDialog } from "./components";
import { SETTINGS_SECTIONS } from "./constants";
import { useService } from "./use-service";

const SECTION_ICONS = {
  notifications: Bell,
  system: Monitor,
  uninstall: Trash2,
} as const;

export function Settings() {
  const {
    settings,
    isLoading,
    error,
    updateSetting,
    activeSection,
    setActiveSection,
    terminalNotifChannel,
    isTerminalNotifLoading,
    setTerminalNotifChannel,
    uninstallDialogOpen,
    setUninstallDialogOpen,
    handleUninstall,
  } = useService();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PageHeader title="Settings" />

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 shrink-0 border-r bg-background p-4">
          <ul className="space-y-1">
            {SETTINGS_SECTIONS.map((section) => {
              const Icon =
                SECTION_ICONS[section.id as keyof typeof SECTION_ICONS];
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      activeSection === section.id
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    {section.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-1 overflow-y-auto bg-muted/40 p-6">
          <div className="mx-auto max-w-xl">
            {activeSection === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notifications</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <CardLoading />
                  ) : error ? (
                    <CardError message={error} />
                  ) : (
                    <NotificationSettings
                      settings={settings}
                      onUpdate={updateSetting}
                      terminalNotifChannel={terminalNotifChannel}
                      isTerminalNotifLoading={isTerminalNotifLoading}
                      onTerminalNotifChannelChange={setTerminalNotifChannel}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {activeSection === "system" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">System</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => invoke("open_log_directory")}
                  >
                    <FileText className="size-4" />
                    Open log files
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeSection === "uninstall" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Uninstall</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Remove Lumo from your system. This will stop the daemon,
                    remove the service configuration, and delete the daemon
                    binary.
                  </p>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setUninstallDialogOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    Uninstall Lumo
                  </Button>
                </CardContent>
              </Card>
            )}

            <UninstallDialog
              open={uninstallDialogOpen}
              onOpenChange={setUninstallDialogOpen}
              onConfirm={handleUninstall}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
