declare module 'pdf-parse' { const parse: (buffer: Buffer | Uint8Array) => Promise<{ text: string; numpages?: number }>; export default parse; }
