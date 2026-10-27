import type { Metadata } from "next";
import { FitFinder } from "@/components/fit-finder";
import { SizeChart } from "@/components/size-chart";
import { Container, PageHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Get your fit",
  description: "Tell us your height, weight and how you like things to fit and we'll recommend your size.",
};

const STEPS = [
  { title: "Tell us about you", text: "Your height, your weight and whether you like clothes snug, regular or loose." },
  { title: "We do the maths", text: "We compare you with typical body measurements for each size and adjust for how each piece is cut." },
  { title: "Shop with confidence", text: "Every product page shows your size, and tells you when it’s sold out in your colour." },
];

export default function FitFinderPage() {
  return (
    <Container className="py-10 sm:py-14">
      <PageHeading eyebrow="Get your fit" title="Find the size that fits you.">
        Answer three quick questions and we’ll recommend a size. Your measurements are saved only in
        this browser, so product pages can show your size instantly.
      </PageHeading>

      <FitFinder mode="page" />

      <section aria-labelledby="how-it-works" className="mt-20">
        <h2 id="how-it-works" className="font-display text-3xl tracking-tight">
          How it works
        </h2>
        <ol className="mt-8 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-accent-ink">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="size-guide" className="mt-20">
        <h2 id="size-guide" className="font-display text-3xl tracking-tight">
          Size guide
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          The recommendation is an estimate. If you know your measurements, compare them with the
          charts below – and if you’re between two sizes, pick the larger one for a relaxed fit.
        </p>
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <SizeChart department="women" />
          <SizeChart department="men" />
        </div>
      </section>
    </Container>
  );
}
