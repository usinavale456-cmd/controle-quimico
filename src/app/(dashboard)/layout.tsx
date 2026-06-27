import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Sidebar from "./sidebar"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="flex h-screen bg-[#0a0a0f]">
      <Sidebar userName={session.user.name} userRole={session.user.role} />
      <main className="flex-1 overflow-auto cinematic-gradient p-6">{children}</main>
    </div>
  )
}
