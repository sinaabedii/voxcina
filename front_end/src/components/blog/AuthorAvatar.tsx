import Image from 'next/image';

/**
 * Known-broken avatar paths that exist in already-published post data but were
 * never actually uploaded to the server (e.g. the AI pipeline's old hardcoded
 * default). Treated the same as "no avatar" so they fall back to the logo
 * instead of a broken image.
 */
const BROKEN_AVATAR_PATHS = new Set(['/uploads/authors/default.jpg']);

interface AuthorAvatarProps {
  avatar?: string;
  name: string;
  className: string;
}

/** Author avatar; falls back to the Voxcina mark on a light badge when no real photo is set (the usual case for "تیم وکسینا"). */
export default function AuthorAvatar({ avatar, name, className }: AuthorAvatarProps) {
  const hasPhoto = !!avatar && !BROKEN_AVATAR_PATHS.has(avatar);

  if (hasPhoto) {
    return (
      <div className={`relative overflow-hidden rounded-full ${className}`}>
        <Image src={avatar as string} alt={name} fill className="object-cover" sizes="32px" />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-full bg-white p-1 ${className}`}>
      <Image src="/images/Logo/icon-navy.png" alt={name} fill className="object-contain" sizes="32px" />
    </div>
  );
}
