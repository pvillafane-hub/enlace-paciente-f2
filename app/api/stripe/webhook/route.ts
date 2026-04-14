import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.text()

  // 🔥 FIX Next.js 16 (headers async)
  const sig = (await headers()).get("stripe-signature")

  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe signature" },
      { status: 400 }
    )
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error("Webhook signature error:", err)

    return NextResponse.json(
      { error: "Webhook error" },
      { status: 400 }
    )
  }

  // 🎯 EVENTO: PAGO COMPLETADO
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any

    const userId = session?.metadata?.userId

    if (!userId) {
      console.error("No userId in metadata")
      return NextResponse.json({ error: "Missing userId" }, { status: 400 })
    }

    console.log("💰 Pago recibido para user:", userId)

    try {
      const existing = await prisma.license.findFirst({
        where: {
          userId,
          role: "DOCTOR"
        }
      })

      if (existing) {
        await prisma.license.update({
          where: { id: existing.id },
          data: {
            status: "ACTIVE",
            plan: "PRO"
          }
        })

        console.log("🔄 Licencia actualizada")
      } else {
        await prisma.license.create({
          data: {
            userId,
            role: "DOCTOR",
            status: "ACTIVE",
            plan: "PRO"
          }
        })

        console.log("🆕 Licencia creada")
      }

    } catch (err) {
      console.error("❌ Error actualizando licencia:", err)
    }
  }

  return NextResponse.json({ received: true })
}