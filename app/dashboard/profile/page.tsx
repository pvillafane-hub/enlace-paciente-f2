import { prisma } from "@/lib/prisma"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import PatientClinicalForm from "app/dashboard/profile/PatientClinicalForm"

export default async function ProfilePage() {

  const session = await getValidatedSession()

  // ✅ FIX CRÍTICO
  if (!session?.userId) {
    redirect("/?auth=required")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId }
  })

  if (!user) {
    redirect("/dashboard")
  }

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <PatientClinicalForm
        initialData={{
          dateOfBirth: user.dateOfBirth?.toISOString().split("T")[0] || "",
          bloodType: user.bloodType || "",
          allergies: user.allergies || "",
        }}
      />
    </div>
  )
}