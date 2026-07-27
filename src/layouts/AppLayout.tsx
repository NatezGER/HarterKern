import { Outlet, ScrollRestoration } from "react-router-dom";
import { Footer } from "@/layouts/Footer";
import { Header } from "@/layouts/Header";
import { AdminProvider } from "@/hooks/useAdmin";
import { PublicDataProvider } from "@/hooks/usePublicData";
import { LiveEventProvider } from "@/hooks/useLiveEvent";
import { LiveEventBanner } from "@/components/events/LiveEventBanner";
import { RecordCelebration } from "@/components/events/RecordCelebration";

export function AppLayout() {
  return (
    <PublicDataProvider>
      <AdminProvider>
        <LiveEventProvider>
          <div className="flex min-h-screen flex-col overflow-x-clip">
            <Header />
            <LiveEventBanner />
            <main className="mx-auto w-full max-w-[1600px] flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
              <Outlet />
            </main>
            <Footer />
            <RecordCelebration />
            <ScrollRestoration />
          </div>
        </LiveEventProvider>
      </AdminProvider>
    </PublicDataProvider>
  );
}
