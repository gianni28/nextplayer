import { useState } from "react";

/** Foto del jugador con respaldo de iniciales si la imagen no carga. */
export function Avatar({ src, name, size = 48, className = "" }: { src: string | null; name: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-line/70 font-display font-bold text-muted ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src && !failed ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}

/** Escudo del club desde el CDN público de Transfermarkt. */
export function ClubCrest({ clubId, size = 18 }: { clubId: number | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!clubId || failed) return null;
  return (
    <img
      src={`https://tmssl.akamaized.net/images/wappen/head/${clubId}.png`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}
