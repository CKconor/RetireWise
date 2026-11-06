import { Loader2 } from 'lucide-react';
import { Header } from '@/components/header';
import { Callout } from '@/components/ui/callout';
import { getTaxYearStatus } from '@/lib/uk-figures';

interface PageShellProps {
  children: React.ReactNode;
  onDownloadPdf?: () => void;
  isGeneratingPdf?: boolean;
}

export function PageShell({ children, onDownloadPdf, isGeneratingPdf }: PageShellProps) {
  const { taxYear, hasEnded } = getTaxYearStatus();

  return (
    <div className="flex min-h-screen flex-col">
      <Header onDownloadPdf={onDownloadPdf} isGeneratingPdf={isGeneratingPdf} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 space-y-8 px-5 py-8">
        {hasEnded && (
          <Callout tone="warning" title={`These results use ${taxYear} tax rules, and that tax year has ended`}>
            Tax and state pension figures may be out of date until the app is updated.
          </Callout>
        )}
        {children}
      </main>
      <footer className="mx-auto w-full max-w-[1200px] px-5 pb-8">
        <p className="text-xs text-ink-10">Using {taxYear} rules. All projections are estimates and do not constitute financial advice.</p>
      </footer>
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-ink-11">
      <Loader2 className="size-4 animate-spin" />
      Loading your forecast…
    </div>
  );
}
