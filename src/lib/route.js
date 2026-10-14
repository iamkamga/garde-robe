import { useEffect, useState } from "react";

// Navigation par hash (#/compte, #/admin) : pas besoin de configurer le serveur.
export function useHashRoute() {
  const read = () => window.location.hash.replace(/^#/, "") || "/";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export const navigate = (path) => {
  window.location.hash = path;
};
