import { stripe } from "@/lib/stripe"
import { getValidatedSession } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function GET() {
  const session = await getValidatedSession()

  if (!session?.userId) {
    redirect("/login")
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Enlace Salud PRO"
          },
          unit_amount: 10000
        },
        quantity: 1
      }
    ],
    success_url: "http://localhost:3000/dashboard",
    cancel_url: "http://localhost:3000/dashboard",
    metadata: {
      userId: session.userId
    }
  })

  // 🔥 CLAVE
  redirect(checkout.url!)
}