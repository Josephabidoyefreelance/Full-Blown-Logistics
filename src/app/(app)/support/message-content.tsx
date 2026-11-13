"use client";
import ChatImage from "./chat-image";
export default function MessageContent({ message }: { message: string }) {
  const match = message.match(/^📎\s*(.+?)\|(https?:\/\/\S+)$/);
  if (!match) return <>{message}</>;
  const [, filename, url] = match;
  const image = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(?:[?#].*)?$/i.test(filename) || /\.(png|jpe?g|gif|webp|bmp|svg|avif)(?:[?#].*)?$/i.test(url);
  if (image) return <ChatImage src={url} alt={filename} />;
  return <a href={url} target="_blank" rel="noopener noreferrer" download={filename} className="inline-flex max-w-full items-center gap-1 break-all underline">📎 {filename} ↗</a>;
}
