interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
}

const PALETTE = ["#00A844", "#C2500A", "#2D6CDF", "#8A3FFC", "#D63384"];

function colorFor(name: string) {
  const code = name.charCodeAt(0) || 0;
  return PALETTE[code % PALETTE.length];
}

export function Avatar({ name, src, size = 36 }: AvatarProps) {
  const style = { width: size, height: size, fontSize: size * 0.4 };

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={style}
        className="rounded-full object-cover ring-1 ring-black/5"
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      style={{ ...style, background: colorFor(name) }}
      className="flex items-center justify-center rounded-full font-semibold text-white"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
