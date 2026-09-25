type EditorialPageHeroProps = {
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
  tone?: "graphite" | "wine" | "black" | "paper";
  meta?: string[];
  children?: React.ReactNode;
};

const toneClassNames = {
  graphite: "editorial-hero",
  wine: "editorial-hero editorial-hero-wine",
  black: "editorial-hero editorial-hero-black",
  paper: "editorial-hero editorial-hero-paper",
} as const;

export function EditorialPageHero({
  index,
  eyebrow,
  title,
  description,
  tone = "graphite",
  meta = [],
  children,
}: EditorialPageHeroProps) {
  const isPaper = tone === "paper";

  return (
    <section className={`${toneClassNames[tone]} p-5 sm:p-8 lg:p-10`}>
      <div className="editorial-hero-number" aria-hidden="true">
        {index}
      </div>

      <div className="relative z-[2] flex min-h-[inherit] flex-col justify-between gap-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className={isPaper ? "neo-kicker !text-[#370803]" : "neo-kicker"}>{eyebrow}</p>
          {meta.length > 0 ? (
            <div
              className={`flex flex-wrap gap-x-5 gap-y-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] ${
                isPaper ? "text-[#370803]/70" : "text-[#837f7c]"
              }`}
            >
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)] lg:items-end">
          <h1
            className={`editorial-hero-title ${isPaper ? "text-[#141414]" : "text-[#cec6c2]"}`}
          >
            {title}
          </h1>

          <div className="lg:pb-2">
            {description ? (
              <p
                className={`max-w-xl text-sm leading-7 sm:text-base ${
                  isPaper ? "text-[#370803]/78" : "text-[#b7aaa4]"
                }`}
              >
                {description}
              </p>
            ) : null}
            {children ? <div className="mt-6">{children}</div> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
