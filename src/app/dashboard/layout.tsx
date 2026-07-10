import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="dashboard-layout">
      <Sidebar userName={`${user.firstName} ${user.lastName}`} />
      <main className="dashboard-content">{children}</main>
    </div>
  );
}
