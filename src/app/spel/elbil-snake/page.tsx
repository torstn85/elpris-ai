import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ElbilSnake from '@/components/games/ElbilSnake';

export const metadata: Metadata = {
  title: 'Elbil-Snake | elpris.ai',
  description: 'Elbil-Snake — ladda elbilen och undvik dyra timmar.',
  robots: 'noindex',
};

export default function ElbilSnakePage() {
  if (process.env.NEXT_PUBLIC_GAMES_ENABLED !== 'true') {
    notFound();
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#050E1C',
      }}
    >
      <ElbilSnake />
    </div>
  );
}
