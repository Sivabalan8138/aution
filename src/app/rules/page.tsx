import Link from 'next/link';
import { ArrowLeft, BookOpen, AlertTriangle } from 'lucide-react';

export default function RulesPage() {
  return (
    <div className="min-h-screen py-20 px-6">
      <div className="container mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-10">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        
        <div className="flex items-center gap-4 mb-12">
          <div className="h-12 w-12 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-widest uppercase">EVENT RULES</h1>
        </div>

        <div className="space-y-8">
          <RuleSection title="1. REGISTRATION & TEAMS">
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Maximum participants: 2 per team.</li>
              <li>Teams must register before the event begins.</li>
              <li>There is no team login. The admin controls the entire event.</li>
              <li>Every team starts with a base score of <strong className="text-primary">5,000 points</strong>.</li>
            </ul>
          </RuleSection>

          <RuleSection title="2. THE AUCTION PROCESS">
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>Questions are displayed on the live screen by the admin.</li>
              <li>Each question has a base value (e.g., Easy = 100, Hard = 500).</li>
              <li>Teams bid points to win the right to answer the question.</li>
              <li>Minimum bid increment is <strong className="text-primary">100 points</strong>.</li>
              <li>The highest bidder when the timer runs out wins the auction.</li>
            </ul>
          </RuleSection>

          <RuleSection title="3. SCORING SYSTEM">
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>If the winning team answers <strong className="text-green-500">CORRECTLY</strong>, their winning bid is <strong>ADDED</strong> to their total score.</li>
              <li>If the winning team answers <strong className="text-red-500">WRONG</strong>, their winning bid is <strong>DEDUCTED</strong> from their total score.</li>
              <li>Negative scores are not allowed. A team cannot bid more than their current points.</li>
            </ul>
          </RuleSection>

          <RuleSection title="4. TIE-BREAKERS & AUTHORITY">
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>In the event of a tie at the end of the game, the team with the higher count of correct answers wins.</li>
              <li>If still tied, the team that achieved their score earlier wins.</li>
              <li><strong className="text-secondary">The Admin's decision is final and binding on all matters.</strong></li>
            </ul>
          </RuleSection>
        </div>

        <div className="mt-16 p-6 border border-yellow-500/30 bg-yellow-500/10 rounded-lg flex gap-4 items-start">
          <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0" />
          <p className="text-sm text-yellow-200">
            Rule violations, disruptive behavior, or arguing with the event host will result in immediate penalty points or disqualification from the challenge.
          </p>
        </div>
      </div>
    </div>
  );
}

function RuleSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="glass-card p-8 border-l-4 border-primary">
      <h2 className="text-xl font-bold tracking-wider mb-4 text-white">{title}</h2>
      {children}
    </div>
  );
}
