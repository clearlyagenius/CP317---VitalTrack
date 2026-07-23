import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import db from "@/lib/db";
import Dashboard from "@/components/Dashboard";
import Link from "next/link";

interface ReportRow {
  id: string;
  fileName: string;
  fileSize: number;
  createdAt: string;
}

export default async function DashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const reports = db
    .prepare(
      "SELECT id, fileName, fileSize, createdAt FROM reports WHERE userId = ? ORDER BY createdAt DESC"
    )
    .all(user.id) as ReportRow[];

  if (reports.length === 0) {
    return (
      <div className="empty-state animate-in">
        <div className="empty-state-icon">📊</div>
        <h2 className="empty-state-title">No Reports Yet</h2>
        <p className="empty-state-text">
          Upload a blood test report first to see your health dashboard with
          metrics and trend analysis.
        </p>
        <Link href="/dashboard/reports" className="btn-primary empty-state-btn">
          Upload a Report
        </Link>
      </div>
    );
  }

  return <Dashboard reports={reports} firstName={user.firstName} />;
}
