import { Wrench } from 'lucide-react';

export default function ComingSoonScreen({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-500/10">
          <Wrench className="h-8 w-8 text-accent-500" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-graphite-900 dark:text-white">{title}</h2>
        <p className="mt-2 text-sm text-graphite-500 max-w-sm">
          This feature is part of the next phase and will be available soon. Phase 1 (vehicle registration,
          QR codes, and public service history) is ready to use now.
        </p>
      </div>
    </div>
  );
}
