'use client';

// A file attachment is stored as: "\ud83d\udcce filename|https://..."
// This renders images as an inline preview and other files as a document card,
// instead of a bare link.

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'];

function isImageUrl(filename: string) {
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export default function MessageContent({ message }: { message: string }) {
  const match = message.match(/^\u{1F4CE} (.+)\|(https?:\/\/\S+)$/u);
  if (!match) return <>{message}</>;

  const [, filename, url] = match;

  if (isImageUrl(filename)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={url}
          alt={filename}
          className="max-h-56 w-auto max-w-full rounded-md border border-black/10 object-contain"
        />
        <span className="mt-1 block truncate text-[11px] opacity-70">{filename}</span>
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-md border border-black/10 bg-black/5 px-3 py-2"
    >
      <span className="text-lg">{'\u{1F4C4}'}</span>
      <span className="truncate text-sm underline">{filename}</span>
    </a>
  );
}
