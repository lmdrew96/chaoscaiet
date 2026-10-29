import { Camera, Link2, MessageSquare, Quote, Type, type LucideIcon } from "lucide-react";
import type { EntryType } from "@/lib/entry-fields";

export const TYPE_META: Record<EntryType, { label: string; icon: LucideIcon }> = {
  text: { label: "Text", icon: Type },
  photo: { label: "Photo", icon: Camera },
  quote: { label: "Quote", icon: Quote },
  link: { label: "Link", icon: Link2 },
  chat: { label: "Chat", icon: MessageSquare },
};

const BAR_TYPES: EntryType[] = ["text", "photo", "quote", "link", "chat"];

/**
 * The row of post-type circles. On the dash it's also the compose header.
 * One row at every width: on phones the five share it instead of wrapping.
 */
export const PostTypeBar = ({
  selected,
  onPick,
}: {
  selected: EntryType | null;
  onPick: (type: EntryType) => void;
}): React.ReactNode => (
  <div className="flex justify-around gap-1 px-2 py-3.5 max-sm:px-1">
    {BAR_TYPES.map((type) => {
      const { label, icon: Icon } = TYPE_META[type];
      const on = type === selected;
      return (
        <button
          key={type}
          type="button"
          aria-pressed={on}
          onClick={() => onPick(type)}
          className={`flex min-h-16 min-w-[72px] cursor-pointer max-sm:min-w-0 max-sm:flex-1 flex-col items-center gap-1.5 rounded text-[13px] ${on ? "font-bold" : ""}`}
        >
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{
              background: `var(--circle-${type})`,
              color: `var(--circle-${type}-fg)`,
              boxShadow: on ? "0 0 0 3px var(--ring-gap), 0 0 0 5px var(--ring)" : "none",
            }}
          >
            <Icon size={20} strokeWidth={2} aria-hidden="true" />
          </span>
          {label}
        </button>
      );
    })}
  </div>
);
