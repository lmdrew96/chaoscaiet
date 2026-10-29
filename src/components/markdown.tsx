import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * The one renderer for entry text. react-markdown never renders raw HTML from
 * the source, so nothing here can inject markup. Images become plain links:
 * loading one would make the browser call another site, and entries never do.
 */
export const Markdown = ({ children }: { children: string }): React.ReactNode => (
  <div className="md">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children: c }) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {c}
          </a>
        ),
        img: ({ src, alt }) => (
          <a href={typeof src === "string" ? src : undefined} target="_blank" rel="noopener noreferrer">
            {alt || "image link"}
          </a>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
);
