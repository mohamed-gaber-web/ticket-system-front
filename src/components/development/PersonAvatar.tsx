import { cn } from '@/lib/utils';
import type { DevPerson } from '@/types/development.types';
import { personName } from '@/lib/development';

interface Props {
  person: Pick<DevPerson, 'firstName' | 'lastName' | 'profilePicture'>;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZES = { xs: 'h-5 w-5 text-[10px]', sm: 'h-6 w-6 text-[11px]', md: 'h-8 w-8 text-xs' };

/** Initials (or photo) in a small round chip; used on cards, tiles and dialogs. */
export function PersonAvatar({ person, size = 'sm', className }: Props) {
  const initials = `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <span
      title={personName(person)}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-brand-600 font-semibold text-white ring-2 ring-surface-container-lowest overflow-hidden',
        SIZES[size],
        className,
      )}
    >
      {person.profilePicture ? (
        <img src={person.profilePicture} alt={personName(person)} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}

/** Up to `max` overlapping avatars with a "+n" tail. */
export function AvatarStack({ people, max = 4 }: { people: DevPerson[]; max?: number }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((p) => (
        <PersonAvatar key={p._id} person={p} />
      ))}
      {rest > 0 && (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-container-high text-[11px] font-semibold text-on-surface-variant ring-2 ring-surface-container-lowest">
          +{rest}
        </span>
      )}
    </div>
  );
}
