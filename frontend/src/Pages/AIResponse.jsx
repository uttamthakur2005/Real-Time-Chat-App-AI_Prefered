import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import 'highlight.js/styles/github-dark.css'

function AIResponse({ text }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        h1: ({ children }) => <h1 className="mb-2 mt-4 text-xl font-bold first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="mb-2 mt-4 text-lg font-bold first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="mb-2 mt-3 font-bold">{children}</h3>,
        p: ({ children }) => <p className="mb-3 last:mb-0 leading-6">{children}</p>,
        ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
        li: ({ children }) => <li className="pl-1">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="my-3 border-l-4 border-violet-300 pl-4 text-slate-600">{children}</blockquote>
        ),
        pre: ({ children }) => (
          <pre className="my-3 max-w-full overflow-x-auto rounded-xl bg-[#0d1117] p-4 text-[13px] leading-6 text-slate-100">
            {children}
          </pre>
        ),
        code: ({ className, children }) => className
          ? <code className={`${className} text-[13px]`}>{children}</code>
          : <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.9em] text-violet-800">{children}</code>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-cyan-700 underline underline-offset-2">
            {children}
          </a>
        ),
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="border border-slate-200 bg-slate-100 px-3 py-2 font-semibold">{children}</th>,
        td: ({ children }) => <td className="border border-slate-200 px-3 py-2">{children}</td>,
        hr: () => <hr className="my-4 border-slate-200" />
      }}
    >
      {text}
    </ReactMarkdown>
  )
}

export default AIResponse
