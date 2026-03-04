import { DashboardHome } from "@/app/components/dashboard-home";
import { getDashboardData } from "@/app/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dashboardData = await getDashboardData();

  return (
    <DashboardHome data={dashboardData} />
  );
}
