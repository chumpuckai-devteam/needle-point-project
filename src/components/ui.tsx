import { type CSSProperties, type ReactNode, useId } from "react";
import { AlertCircle, Inbox } from "lucide-react";

/** Layout chrome shared by empty / error / loading surfaces. */
export type StateVariant = "panel" | "inline" | "compact" | "detail";

type StateActionProps = {
  /** Primary CTA label (renders a button when onAction is set). */
  action?: string;
  onAction?: () => void;
  /** Custom CTA slot — preferred when you need a link, dual buttons, etc. */
  cta?: ReactNode;
};

function StateActions({ action, onAction, cta, buttonClass = "secondary" }: StateActionProps & { buttonClass?: string }) {
  if (cta) return <div className="state-block-cta">{cta}</div>;
  if (action && onAction) {
    return (
      <div className="state-block-cta">
        <button type="button" className={buttonClass} onClick={onAction}>
          {action}
        </button>
      </div>
    );
  }
  return null;
}

function stateClassName(base: string, variant: StateVariant = "panel", className = "") {
  return [base, `${base}--${variant}`, className].filter(Boolean).join(" ");
}

function styleWithMinHeight(minHeight?: number | string, style?: CSSProperties): CSSProperties | undefined {
  if (minHeight == null && !style) return style;
  return {
    ...style,
    ...(minHeight != null ? { minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight } : null),
  };
}

/**
 * Empty list / section placeholder.
 * Prefer a stable `minHeight` matching the loaded content region to avoid layout jump.
 *
 * @example list
 * ```tsx
 * {items.length === 0 ? (
 *   <EmptyState
 *     variant="panel"
 *     minHeight={280}
 *     title="No matching projects"
 *     body="Try a broader stitch, color, or creator search."
 *     action="Reset filters"
 *     onAction={clearFilters}
 *   />
 * ) : (
 *   <div className="feed-timeline">{items.map(...)}</div>
 * )}
 * ```
 *
 * @example detail
 * ```tsx
 * <EmptyState
 *   variant="detail"
 *   title="Project not found"
 *   body="It may have been removed or set to private."
 *   action="Back home"
 *   onAction={() => setView({ name: "home" })}
 * />
 * ```
 */
export function EmptyState({
  title,
  body,
  action,
  onAction,
  cta,
  variant = "panel",
  className = "",
  icon,
  children,
  minHeight,
  style,
}: {
  title: string;
  body: string;
  variant?: StateVariant;
  className?: string;
  icon?: ReactNode;
  children?: ReactNode;
  /** Reserve height so empty ↔ content swaps do not jump the page. */
  minHeight?: number | string;
  style?: CSSProperties;
} & StateActionProps) {
  return (
    <div
      className={stateClassName("empty-state", variant, className)}
      style={styleWithMinHeight(minHeight, style)}
      role="status"
    >
      <div className="state-block-icon" aria-hidden="true">
        {icon ?? <Inbox size={22} strokeWidth={1.75} />}
      </div>
      <strong className="state-block-title">{title}</strong>
      <p className="state-block-body">{body}</p>
      {children}
      <StateActions action={action} onAction={onAction} cta={cta} buttonClass="secondary" />
    </div>
  );
}

/**
 * Recoverable error surface (load failure, mutation error with retry).
 *
 * @example list
 * ```tsx
 * {error ? (
 *   <ErrorState
 *     variant="panel"
 *     minHeight={280}
 *     title="Couldn’t load the feed"
 *     body={error}
 *     action="Try again"
 *     onAction={reload}
 *   />
 * ) : null}
 * ```
 *
 * @example detail
 * ```tsx
 * <ErrorState
 *   variant="detail"
 *   title="Couldn’t open this project"
 *   body="Check your connection and try again."
 *   action="Retry"
 *   onAction={retry}
 * />
 * ```
 */
export function ErrorState({
  title,
  body,
  action = "Try again",
  onAction,
  cta,
  variant = "panel",
  className = "",
  icon,
  children,
  minHeight,
  style,
}: {
  title: string;
  body: string;
  variant?: StateVariant;
  className?: string;
  icon?: ReactNode;
  children?: ReactNode;
  minHeight?: number | string;
  style?: CSSProperties;
} & StateActionProps) {
  return (
    <div
      className={stateClassName("error-state", variant, className)}
      style={styleWithMinHeight(minHeight, style)}
      role="alert"
    >
      <div className="state-block-icon state-block-icon--error" aria-hidden="true">
        {icon ?? <AlertCircle size={22} strokeWidth={1.75} />}
      </div>
      <strong className="state-block-title">{title}</strong>
      <p className="state-block-body">{body}</p>
      {children}
      <StateActions action={action} onAction={onAction} cta={cta} buttonClass="primary" />
    </div>
  );
}

/** Single shimmer bone — building block for layout-specific skeletons. */
export function Skeleton({
  width,
  height,
  radius,
  circle = false,
  className = "",
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  circle?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const resolved: CSSProperties = {
    width: width == null ? undefined : typeof width === "number" ? `${width}px` : width,
    height: height == null ? undefined : typeof height === "number" ? `${height}px` : height,
    borderRadius: circle ? "50%" : radius == null ? undefined : typeof radius === "number" ? `${radius}px` : radius,
    ...style,
  };
  return <span className={["skeleton-bone", circle ? "skeleton-bone--circle" : "", className].filter(Boolean).join(" ")} style={resolved} aria-hidden="true" />;
}

/** Stack of text-line bones. Last line can be shorter for a natural look. */
export function SkeletonText({
  lines = 3,
  lastWidth = "62%",
  className = "",
}: {
  lines?: number;
  lastWidth?: number | string;
  className?: string;
}) {
  const count = Math.max(1, lines);
  return (
    <div className={["skeleton-text", className].filter(Boolean).join(" ")} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton
          key={index}
          className="skeleton-text-line"
          width={index === count - 1 && count > 1 ? lastWidth : "100%"}
          height={12}
        />
      ))}
    </div>
  );
}

/** Studio feed row skeleton — matches `.feed-post` header + body geometry. */
export function FeedPostSkeleton({
  withMedia = true,
  className = "",
}: {
  withMedia?: boolean;
  className?: string;
}) {
  return (
    <article className={["feed-post", "feed-post-skeleton", className].filter(Boolean).join(" ")} aria-hidden="true">
      <header className="feed-post-header">
        <Skeleton circle width={48} height={48} className="feed-skel-avatar" />
        <div className="feed-post-heading">
          <div className="feed-skel-meta">
            <Skeleton width="28%" height={12} />
            <Skeleton width="18%" height={12} />
            <Skeleton width={52} height={18} radius={999} />
          </div>
        </div>
      </header>
      <div className="feed-post-body">
        <SkeletonText lines={2} lastWidth="72%" />
        {withMedia ? <Skeleton className="feed-skel-media" height="100%" radius={22} /> : null}
        <div className="feed-skel-actions">
          <Skeleton width={28} height={18} radius={6} />
          <Skeleton width={28} height={18} radius={6} />
          <Skeleton width={28} height={18} radius={6} />
          <Skeleton width={28} height={18} radius={6} />
        </div>
      </div>
    </article>
  );
}

/** Vertical list of feed post skeletons (Studio / Discover loading). */
export function FeedListSkeleton({
  count = 3,
  withMedia = true,
  className = "",
  label = "Loading posts",
}: {
  count?: number;
  withMedia?: boolean;
  className?: string;
  label?: string;
}) {
  const n = Math.max(1, count);
  return (
    <div className={["feed-timeline", "feed-list-skeleton", className].filter(Boolean).join(" ")} aria-busy="true" aria-label={label} role="status">
      {Array.from({ length: n }, (_, index) => (
        <FeedPostSkeleton key={index} withMedia={withMedia && index === 0} />
      ))}
    </div>
  );
}

/** Compact visual tile / project card skeleton. */
export function CardSkeleton({
  compact = true,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <article className={["visual-tile", "card-skeleton", className].filter(Boolean).join(" ")} aria-hidden="true">
        <Skeleton className="card-skel-media" radius={8} />
        <div className="card-skel-meta">
          <Skeleton width="40%" height={10} />
          <Skeleton width="78%" height={12} />
        </div>
      </article>
    );
  }
  return (
    <article className={["project-card", "card-skeleton", "card-skeleton--wide", className].filter(Boolean).join(" ")} aria-hidden="true">
      <Skeleton className="card-skel-media" radius={0} />
      <div className="card-skel-meta wide">
        <SkeletonText lines={3} lastWidth="55%" />
        <div className="feed-skel-actions">
          <Skeleton width={64} height={18} radius={6} />
          <Skeleton width={48} height={18} radius={6} />
        </div>
      </div>
    </article>
  );
}

/** Grid of card skeletons (collections, profile projects, discover grid). */
export function CardGridSkeleton({
  count = 4,
  className = "",
  label = "Loading cards",
}: {
  count?: number;
  className?: string;
  label?: string;
}) {
  const n = Math.max(1, count);
  return (
    <div className={["card-grid-skeleton", className].filter(Boolean).join(" ")} aria-busy="true" aria-label={label} role="status">
      {Array.from({ length: n }, (_, index) => (
        <CardSkeleton key={index} compact />
      ))}
    </div>
  );
}

/**
 * Project / shop / profile detail loading shell.
 * Fixed min-height keeps the page from collapsing while data hydrates.
 */
export function DetailSkeleton({
  className = "",
  label = "Loading details",
  withSidebar = true,
}: {
  className?: string;
  label?: string;
  withSidebar?: boolean;
}) {
  return (
    <div className={["detail-skeleton", className].filter(Boolean).join(" ")} aria-busy="true" aria-label={label} role="status">
      <div className="detail-skel-hero">
        <Skeleton className="detail-skel-cover" radius={12} />
        <div className="detail-skel-heading">
          <Skeleton width="42%" height={14} />
          <Skeleton width="70%" height={22} />
          <SkeletonText lines={2} lastWidth="58%" />
          <div className="feed-skel-actions">
            <Skeleton width={96} height={36} radius={8} />
            <Skeleton width={96} height={36} radius={8} />
          </div>
        </div>
      </div>
      <div className={withSidebar ? "detail-skel-body" : "detail-skel-body detail-skel-body--single"}>
        <div className="detail-skel-main panel">
          <Skeleton width="36%" height={16} />
          <SkeletonText lines={4} lastWidth="68%" />
          <Skeleton className="detail-skel-block" radius={8} />
        </div>
        {withSidebar ? (
          <aside className="detail-skel-aside panel">
            <Skeleton width="50%" height={14} />
            <SkeletonText lines={3} lastWidth="70%" />
            <Skeleton width="100%" height={40} radius={8} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/** Generic page-level loading block (auth session, profile hydrate). */
export function PageLoading({
  title = "Loading…",
  eyebrow,
  variant = "detail",
  className = "",
  minHeight = 320,
}: {
  title?: string;
  eyebrow?: string;
  variant?: StateVariant;
  className?: string;
  minHeight?: number | string;
}) {
  return (
    <div className={stateClassName("page-loading", variant, className)} style={styleWithMinHeight(minHeight)} aria-busy="true" role="status">
      {eyebrow ? <p className="eyebrow page-loading-eyebrow">{eyebrow}</p> : null}
      <strong className="state-block-title">{title}</strong>
      <div className="page-loading-bones" aria-hidden="true">
        <Skeleton width="48%" height={14} />
        <SkeletonText lines={3} lastWidth="64%" />
      </div>
    </div>
  );
}

export function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="section-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
    </header>
  );
}

export function SectionTitle({
  title,
  action,
  onAction,
  headingId,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  /** Optional id for scroll/focus targets (e.g. online shops recovery). */
  headingId?: string;
}) {
  return (
    <div className="section-title">
      <h2 id={headingId} tabIndex={headingId ? -1 : undefined}>
        {title}
      </h2>
      {action && (
        <button className="text-button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}

export function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <label htmlFor={id}>
      {label}
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder = "",
  required = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <label htmlFor={id} className={className}>
      <span className="label-text">
        {label}
        {required ? <span className="required-mark"> Required</span> : null}
      </span>
      <input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} required={required} />
    </label>
  );
}

export function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="meta">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
