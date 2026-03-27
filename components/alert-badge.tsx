interface AlertBadgeProps {
  type: "danger" | "warning";
  message: string;
}

export default function AlertBadge({ type, message }: AlertBadgeProps) {
  const isDanger = type === "danger";

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: isDanger
          ? "rgba(255, 107, 107, 0.15)"
          : "rgba(255, 179, 71, 0.15)",
        color: isDanger ? "var(--accent-red)" : "var(--accent-yellow)",
      }}
    >
      {isDanger ? "\u{1F6A8}" : "\u{26A0}\u{FE0F}"} {message}
    </span>
  );
}
