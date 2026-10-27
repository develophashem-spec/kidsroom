import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeading } from "@/components/ui";
import { shippingConfig } from "@/config/site";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = {
  title: "Shipping, payment & help",
  description: "How shipping, cash on delivery, cancellations and sizing work.",
};

export default function HelpPage() {
  const sections = [
    {
      title: "Shipping",
      body: `Shipping is a flat ${formatMoney(shippingConfig.flatRate)} per order and free when your order is ${formatMoney(shippingConfig.freeThreshold)} or more. Prices include tax. We confirm your order first, then ship it – you can follow every step in your account.`,
    },
    {
      title: "Payment",
      body: "Pay in cash when your order arrives. There’s nothing to enter online – choose your items, add your delivery address and place the order.",
    },
    {
      title: "Cancelling an order",
      body: "Changed your mind? While an order is still pending you can cancel it yourself from My orders and the items go straight back on our shelves. Once an order has been confirmed or shipped, please contact the store and we’ll help.",
    },
    {
      title: "Sizing",
      body: "Every product page shows a size guide, and our fit finder recommends a size from your height, weight and how you like clothes to fit.",
    },
  ];

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <PageHeading eyebrow="Help" title="Shipping, payment & help" />
      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-2xl">{section.title}</h2>
            <p className="mt-2 leading-relaxed text-muted">{section.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-12 text-sm text-muted">
        Ready to shop?{" "}
        <Link href="/fit-finder" className="font-medium text-ink underline underline-offset-4">
          Get your fit
        </Link>{" "}
        or{" "}
        <Link href="/shop" className="font-medium text-ink underline underline-offset-4">
          browse everything
        </Link>
        .
      </p>
    </Container>
  );
}
