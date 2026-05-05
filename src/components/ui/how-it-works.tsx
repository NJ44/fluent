"use client";

import { cn } from "@/lib/utils";
import { MessageSquare, PhoneCall, ScrollText } from "lucide-react";
import type React from "react";

interface StepCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefits: string[];
}

const StepCard: React.FC<StepCardProps> = ({ icon, title, description, benefits }) => (
  <div
    className={cn(
      "relative rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 transition-all duration-300 ease-in-out",
      "hover:scale-[1.03] hover:shadow-lg hover:border-teal-200 hover:bg-slate-50"
    )}
  >
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
      {icon}
    </div>
    <h3 className="mb-2 text-xl font-semibold text-slate-900">{title}</h3>
    <p className="mb-6 text-slate-500 text-sm leading-relaxed">{description}</p>
    <ul className="space-y-3">
      {benefits.map((benefit, index) => (
        <li key={index} className="flex items-center gap-3">
          <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-teal-100">
            <div className="h-2 w-2 rounded-full bg-teal-500" />
          </div>
          <span className="text-slate-500 text-sm">{benefit}</span>
        </li>
      ))}
    </ul>
  </div>
);

export const HowItWorks: React.FC<React.HTMLAttributes<HTMLElement>> = ({ className, ...props }) => {
  const stepsData = [
    {
      icon: <MessageSquare className="h-6 w-6" />,
      title: "Type what to say",
      description:
        "Open Aloud and write your message. Use quick-start templates or type freely — works for any type of call.",
      benefits: [
        "Doctors, customer service, sales, personal — any call",
        "Pre-built templates for common scenarios",
        "Set tone: professional, casual, or assertive",
      ],
    },
    {
      icon: <PhoneCall className="h-6 w-6" />,
      title: "Your cloned voice calls",
      description:
        "Aloud synthesizes your voice in real time and makes the call on your behalf. It sounds exactly like you.",
      benefits: [
        "Natural, human-sounding — not a robot voice",
        "Works with any phone number, worldwide",
        "The other person hears you",
      ],
    },
    {
      icon: <ScrollText className="h-6 w-6" />,
      title: "Follow live, jump in anytime",
      description:
        "Read the full conversation word-by-word as it unfolds. One tap and you take over the call instantly.",
      benefits: [
        "Live word-by-word transcript",
        "One-tap barge-in to take control",
        "Full summary and recording after",
      ],
    },
  ];

  return (
    <section
      id="how-it-works"
      className={cn("w-full bg-white py-16 sm:py-24", className)}
      {...props}
    >
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-4xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Three steps from opening Aloud to finishing a real call — hands-free.
          </p>
        </div>

        {/* Step number indicators with connecting line */}
        <div className="relative mx-auto mb-8 w-full max-w-4xl">
          <div
            aria-hidden="true"
            className="absolute left-[16.6667%] top-1/2 h-0.5 w-[66.6667%] -translate-y-1/2 bg-slate-200"
          />
          <div className="relative grid grid-cols-3">
            {stepsData.map((_, index) => (
              <div
                key={index}
                className="flex h-8 w-8 items-center justify-center justify-self-center rounded-full border border-teal-200 bg-teal-50 text-sm font-semibold text-teal-700 ring-4 ring-white"
              >
                {index + 1}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
          {stepsData.map((step, index) => (
            <StepCard
              key={index}
              icon={step.icon}
              title={step.title}
              description={step.description}
              benefits={step.benefits}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
