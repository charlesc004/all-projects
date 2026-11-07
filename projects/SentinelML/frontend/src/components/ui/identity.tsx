import Link from "next/link";

export function SentinelMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m20 3 15 8.5v17L20 37 5 28.5v-17L20 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m12 21 6 5 11-14"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Wordmark({ linked = true }: { linked?: boolean }) {
  const content = (
    <>
      <SentinelMark />
      <span className="wordmark-type">
        Sentinel<span className="wordmark-ml">ML</span>
      </span>
    </>
  );
  return linked ? (
    <Link href="/" className="wordmark" aria-label="SentinelML home">
      {content}
    </Link>
  ) : (
    <div className="wordmark">{content}</div>
  );
}
