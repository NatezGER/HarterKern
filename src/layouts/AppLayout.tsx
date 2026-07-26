import { Outlet, ScrollRestoration } from "react-router-dom";
import { Footer } from "@/layouts/Footer";
import { Header } from "@/layouts/Header";

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-[1600px] flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <Outlet />
      </main>
      <Footer />
      <ScrollRestoration />
    </div>
  );
}
