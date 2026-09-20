import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'InstaReelRAG - Multimodal Search Dashboard',
  description: 'Multimodal Instagram Reel RAG powered by Faster-Whisper, GPU CLIP, Qdrant & Local LLMs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-butterBg text-darkText font-sans selection:bg-butterAccent selection:text-black">
        {children}
      </body>
    </html>
  );
}
