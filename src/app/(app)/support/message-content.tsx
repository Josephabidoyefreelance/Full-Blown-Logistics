// A file attachment is stored as: "📎 filename|https://..."
// This renders it as a clickable link instead of raw text.
export default function MessageContent({ message }: { message: string }) {
  const match = message.match(/^📎 (.+)\|(https?:\/\/\S+)$/);
  if (match) {
    const [, filename, url] = match;
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
        📎 {filename}
      </a>
    );
  }
  return <>{message}</>;
}
