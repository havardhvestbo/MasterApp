import { DashboardHome } from "@/app/components/dashboard-home";
import { ApiRequestError, getDashboardData } from "@/app/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  let dashboardData = null;
  let errorMessage: string | null = null;

  try {
    dashboardData = await getDashboardData();
  } catch (error) {
    errorMessage =
      error instanceof ApiRequestError
        ? error.message
        : "Unable to load dashboard data from backend API.";
  }

  if (errorMessage || !dashboardData) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
        <section className="w-full rounded-2xl border border-[#C1603A]/35 bg-[#F5F0E8] p-8 text-[#3B2A1A] shadow-[0_18px_36px_rgba(59,42,26,0.11)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8A3E22]">
            Backend Required
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Dashboard Unavailable</h1>
          <p className="mt-3 text-sm text-[#6B4E2F]">{errorMessage}</p>
          <p className="mt-5 text-sm text-[#6B4E2F]">
            Start the backend with <code>dotnet run --project server</code> and
            reload this page.
          </p>
        </section>
      </main>
    );
  }

  return <DashboardHome data={dashboardData} />;
}
