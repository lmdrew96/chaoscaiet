import { Camera, Link2, MessageSquare, Quote, Type, type LucideIcon } from "lucide-react";

export type PostType = "text" | "photo" | "quote" | "link" | "chat";

export const POST_TYPES: { type: PostType; label: string; icon: LucideIcon }[] = [
  { type: "text", label: "Text", icon: Type },
  { type: "photo", label: "Photo", icon: Camera },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "link", label: "Link", icon: Link2 },
  { type: "chat", label: "Chat", icon: MessageSquare },
];

/** The row of post-type circles at the top of the dash. Compose opens from here. */
export const PostTypeBar = (): React.ReactNode => (
  <div className="flex flex-wrap justify-around gap-1 px-2 py-3.5">
    {POST_TYPES.map(({ type, label, icon: Icon }) => (
      <button
        key={type}
        type="button"
        aria-pressed={false}
        className="flex min-h-16 min-w-[72px] cursor-pointer flex-col items-center gap-1.5 rounded text-[13px]"
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full"
          style={{ background: `var(--circle-${type})`, color: `var(--circle-${type}-fg)` }}
        >
          <Icon size={20} strokeWidth={2} aria-hidden="true" />
        </span>
        {label}
      </button>
    ))}
  </div>
);
