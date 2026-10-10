import { Share2 } from 'lucide-react';

export default function SocialMedia() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="display-sm text-on-surface">Social Media</h1>
        <p className="text-on-surface-variant mt-1">Plan and track posts across the company's social channels.</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 rounded-[1rem] bg-surface-container-lowest py-20 text-center">
        <span className="rounded-full bg-surface-container-high p-4 text-on-surface-variant">
          <Share2 className="h-7 w-7" />
        </span>
        <p className="text-lg font-bold text-on-surface">Coming soon</p>
        <p className="max-w-md text-sm text-on-surface-variant">This section is being prepared and will be available in a future update.</p>
      </div>
    </div>
  );
}
