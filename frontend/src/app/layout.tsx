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
      <body class="bg-darkBg text-slate-100 antialiased selection:bg-accentGreen/30 selection:text-accentGreen">
        {children}
      </body>
    </html>
  );
}
