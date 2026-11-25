import type { LucideIcon } from "lucide-react";
import { BookOpen, GraduationCap, Building2 } from "lucide-react";

export interface PaymentPackage {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  priceLabel: string;
  currency: string;
  features: string[];
  highlighted: boolean;
  icon: LucideIcon;
  accentColor: string;
  stripeProductName: string;
}

export const PAYMENT_PACKAGES: PaymentPackage[] = [
  {
    id: "basic",
    name: "Basic",
    description: "Perfect for students getting started",
    priceCents: 499,
    priceLabel: "$4.99",
    currency: "usd",
    features: [
      "All Elementary calculators",
      "All Middle School calculators",
      "Step-by-step solutions",
      "Calculation history (30 days)",
    ],
    highlighted: false,
    icon: BookOpen,
    accentColor: "#10B981",
    stripeProductName: "Math Calculator — Basic Plan",
  },
  {
    id: "pro",
    name: "Pro",
    description: "Best value for serious learners",
    priceCents: 999,
    priceLabel: "$9.99",
    currency: "usd",
    features: [
      "All Basic features",
      "All High School calculators",
      "University-level calculators",
      "Unlimited calculation history",
      "Export results to PDF",
      "Priority support",
    ],
    highlighted: true,
    icon: GraduationCap,
    accentColor: "var(--primary)",
    stripeProductName: "Math Calculator — Pro Plan",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "Complete access for teams & institutions",
    priceCents: 2999,
    priceLabel: "$29.99",
    currency: "usd",
    features: [
      "All Pro features",
      "Up to 10 team seats",
      "Admin dashboard access",
      "Analytics & usage reports",
      "Custom branding",
      "SSO integration",
      "Dedicated account manager",
    ],
    highlighted: false,
    icon: Building2,
    accentColor: "#c084fc",
    stripeProductName: "Math Calculator — Enterprise Plan",
  },
];
