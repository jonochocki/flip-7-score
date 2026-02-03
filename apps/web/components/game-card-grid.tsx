"use client";

type CardSpec = {
  label: string;
  color: string;
};

type GameCardGridProps = {
  numberCards: CardSpec[];
  modifierCards: CardSpec[];
  selectedCards: string[];
  onToggleCard: (label: string) => void;
};

export function GameCardGrid({
  numberCards,
  modifierCards,
  selectedCards,
  onToggleCard,
}: GameCardGridProps) {
  const cardBase =
    "group relative flex aspect-[3/4] w-full flex-col items-center justify-between overflow-hidden rounded-[12px] border-[3px] border-[#1f2b7a] bg-[#f7f2e7] shadow-[0_10px_18px_rgba(31,43,122,0.18)] transition sm:rounded-[18px]";
  const cardSelected = "border-[#1f2b7a] shadow-[0_14px_28px_rgba(15,23,42,0.35)]";
  const gradientByColor: Record<string, string> = {
    "text-neutral-900":
      "bg-gradient-to-br from-slate-500 via-slate-700 to-slate-900",
    "text-stone-600":
      "bg-gradient-to-br from-stone-400 via-stone-600 to-stone-800",
    "text-stone-400":
      "bg-gradient-to-br from-stone-200 via-stone-400 to-stone-600",
    "text-lime-300":
      "bg-gradient-to-br from-lime-200 via-lime-400 to-lime-600",
    "text-lime-500":
      "bg-gradient-to-br from-lime-300 via-lime-500 to-lime-700",
    "text-lime-600":
      "bg-gradient-to-br from-lime-400 via-lime-600 to-lime-800",
    "text-rose-500":
      "bg-gradient-to-br from-rose-300 via-rose-500 to-rose-700",
    "text-teal-400":
      "bg-gradient-to-br from-teal-200 via-teal-400 to-teal-600",
    "text-emerald-500":
      "bg-gradient-to-br from-emerald-300 via-emerald-500 to-emerald-700",
    "text-purple-500":
      "bg-gradient-to-br from-purple-300 via-purple-500 to-purple-700",
    "text-rose-400":
      "bg-gradient-to-br from-rose-200 via-rose-400 to-rose-600",
    "text-lime-400":
      "bg-gradient-to-br from-lime-200 via-lime-500 to-lime-700",
    "text-orange-400":
      "bg-gradient-to-br from-orange-200 via-orange-500 to-orange-700",
    "text-red-500":
      "bg-gradient-to-br from-red-300 via-red-500 to-red-700",
    "text-sky-400":
      "bg-gradient-to-br from-sky-200 via-sky-500 to-sky-700",
    "text-stone-500":
      "bg-gradient-to-br from-stone-300 via-stone-500 to-stone-700",
    "text-orange-500":
      "bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700",
  };
  return (
    <section className="p-0">
      <div className="grid gap-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-3">
          {numberCards.slice(0, 7).map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => onToggleCard(card.label)}
              className={`${cardBase} ${
                selectedCards.includes(card.label)
                  ? `${cardSelected} ${gradientByColor[card.color] ?? ""}`
                  : ""
              }`}
            >
              <div className="absolute inset-0.5 rounded-[10px] border border-[#1f2b7a]/20 sm:inset-2 sm:rounded-[14px]" />
              <div className="absolute left-1/2 top-1 hidden h-1 w-6 -translate-x-1/2 rounded-full border-2 border-[#1f2b7a]/70 bg-white sm:block sm:h-2 sm:w-10" />
              <div className="absolute bottom-1 left-1/2 hidden h-1 w-6 -translate-x-1/2 rounded-full border-2 border-[#1f2b7a]/70 bg-white sm:block sm:h-2 sm:w-10" />
              <div className="relative flex w-full flex-1 items-center justify-center pt-1 text-xl font-semibold sm:pt-4 sm:text-5xl">
                <span
                  className={`font-atkinson font-bold drop-shadow-sm ${
                    selectedCards.includes(card.label) ? "text-white" : card.color
                  }`}
                >
                  {card.label}
                </span>
              </div>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-1 sm:gap-3">
          {numberCards.slice(7).map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => onToggleCard(card.label)}
              className={`${cardBase} ${
                selectedCards.includes(card.label)
                  ? `${cardSelected} ${gradientByColor[card.color] ?? ""}`
                  : ""
              }`}
            >
              <div className="absolute inset-0.5 rounded-[10px] border border-[#1f2b7a]/20 sm:inset-2 sm:rounded-[14px]" />
              <div className="absolute left-1/2 top-1 hidden h-1 w-6 -translate-x-1/2 rounded-full border-2 border-[#1f2b7a]/70 bg-white sm:block sm:h-2 sm:w-10" />
              <div className="absolute bottom-1 left-1/2 hidden h-1 w-6 -translate-x-1/2 rounded-full border-2 border-[#1f2b7a]/70 bg-white sm:block sm:h-2 sm:w-10" />
              <div className="relative flex w-full flex-1 items-center justify-center pt-1 text-xl font-semibold sm:pt-4 sm:text-5xl">
                <span
                  className={`font-atkinson font-bold drop-shadow-sm ${
                    selectedCards.includes(card.label) ? "text-white" : card.color
                  }`}
                >
                  {card.label}
                </span>
              </div>
            </button>
          ))}
        </div>
        <div className="h-px w-full bg-[#8dbfc5]" />
        <div className="grid grid-cols-6 gap-1 sm:gap-3">
          {modifierCards.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => onToggleCard(card.label)}
              className={`${cardBase} ${
                selectedCards.includes(card.label)
                  ? `${cardSelected} ${gradientByColor[card.color] ?? ""}`
                  : ""
              }`}
            >
              <div className="absolute inset-0.5 rounded-[10px] border border-[#1f2b7a]/20 sm:inset-2 sm:rounded-[14px]" />
              <div className="absolute left-1/2 top-1 hidden h-1 w-6 -translate-x-1/2 rounded-full border-2 border-[#1f2b7a]/70 bg-white sm:block sm:h-2 sm:w-10" />
              <div className="absolute bottom-1 left-1/2 hidden h-1 w-6 -translate-x-1/2 rounded-full border-2 border-[#1f2b7a]/70 bg-white sm:block sm:h-2 sm:w-10" />
              <div className="relative flex w-full flex-1 items-center justify-center pt-1 text-xl font-semibold sm:pt-4 sm:text-5xl">
                <span
                  className={`font-atkinson font-bold drop-shadow-sm ${
                    selectedCards.includes(card.label) ? "text-white" : card.color
                  }`}
                >
                  {card.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
