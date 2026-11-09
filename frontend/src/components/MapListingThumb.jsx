import { useState } from "react";
import { mediaVariant } from "../utils/propertyImages";
import { cn } from "../utils/cn";

/** Map sidebar / popup thumb: no broken-icon flash when a hotlink 404s. */
export default function MapListingThumb({ images, className = "h-20 w-24 shrink-0 rounded-xl" }) {
  const list = (Array.isArray(images) ? images : []).filter((url) => typeof url === "string" && url);
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const src = !failed && list[index] ? mediaVariant(list[index], "sm") : null;

  if (!src) {
    return <div className={cn(className, "bg-line/40")} aria-hidden />;
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      className={cn(className, "object-cover")}
      onError={() => {
        if (index + 1 < list.length) setIndex((value) => value + 1);
        else setFailed(true);
      }}
    />
  );
}
