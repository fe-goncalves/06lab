type PersonAvatarPlaceholderProps = {
  size?: number;
  className?: string;
  fill?: boolean;
};

export function PersonAvatarPlaceholder({ size = 28, className, fill = false }: PersonAvatarPlaceholderProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={fill ? "100%" : size}
      height={fill ? "100%" : size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2m0 2a8 8 0 0 0-5 14.246V16l2-2h6l2 2v2.245A8 8 0 0 0 12 4m0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6"
        fill="currentColor"
      />
    </svg>
  );
}
