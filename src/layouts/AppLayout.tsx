import { Outlet, ScrollRestoration } from "react-router-dom";
import { Footer } from "@/layouts/Footer";
import { Header } from "@/layouts/Header";
import { DataPlatformProvider } from "@/hooks/useDataPlatform";
import { LiveEventProvider } from "@/hooks/useLiveEvent";
import { LiveEventBanner } from "@/components/events/LiveEventBanner";
import { RecordCelebration } from "@/components/events/RecordCelebration";
import { ManagementModeProvider } from "@/hooks/useManagementMode";
import { SyncStatusNotice } from "@/components/common/SyncStatusNotice";

export function AppLayout() {
  return (
    <DataPlatformProvider>
      <LiveEventProvider>
        <ManagementModeProvider>
          <div className="flex min-h-screen flex-col overflow-x-clip">
            <Header />
            <LiveEventBanner />
            <SyncStatusNotice />
            <main className="mx-auto w-full max-w-[1600px] flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
              <Outlet />
            </main>
            <Footer />
            <RecordCelebration />
            <ScrollRestoration />
          </div>
        </ManagementModeProvider>
      </LiveEventProvider>
    </DataPlatformProvider>
  );
}
