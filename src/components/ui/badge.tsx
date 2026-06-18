type Tone = "gray" | "green" | "amber" | "red" | "blue" | "purple";

const TONES: Record<Tone, { bg: string; color: string }> = {
  green: { bg: "rgba(95,208,138,.13)", color: "#74D9A0" },
  amber: { bg: "rgba(246,217,78,.15)", color: "#F6D94E" },
  blue: { bg: "rgba(125,170,255,.15)", color: "#9CC0FF" },
  red: { bg: "rgba(242,134,138,.15)", color: "#F2868A" },
  purple: { bg: "rgba(170,150,255,.15)", color: "#BBA8FF" },
  gray: { bg: "rgba(255,255,255,.07)", color: "#A7ABB2" },
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <span
      style={{ background: t.bg, color: t.color }}
      className="inline-flex items-center rounded-[7px] px-[9px] py-[3px] text-[11.5px] font-bold leading-none"
    >
      {children}
    </span>
  );
}

/** Map an invoice/quote status to a pill tone. */
export function statusTone(status: string): Tone {
  switch (status) {
    case "PAID":
    case "ACCEPTED":
      return "green";
    case "SENT":
      return "blue";
    case "PARTIALLY_PAID":
      return "amber";
    case "OVERDUE":
    case "REJECTED":
    case "EXPIRED":
      return "red";
    case "CONVERTED":
      return "purple";
    case "DRAFT":
    case "CANCELLED":
    default:
      return "gray";
  }
}
