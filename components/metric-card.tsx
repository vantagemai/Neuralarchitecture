interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  prefix?: string;
}

export default function MetricCard({ title, value, change, prefix }: MetricCardProps) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <p className="text-sm mb-1" style={{ color: "var(--muted)" }}>
        {title}
      </p>
      <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        {prefix}
        {value}
      </p>
      {change !== undefined && (
        <p
          className="text-sm mt-2 font-medium"
          style={{
            color: change >= 0 ? "var(--accent-green)" : "var(--accent-red)",
          }}
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
