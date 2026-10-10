import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSeoTags } from '../../seo.mjs';

// Keep metadata correct when React Router navigates without a full page load.
export default function RouteSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.querySelectorAll('[data-washpro-seo]').forEach((element) => element.remove());
    getSeoTags(pathname === '/').forEach(({ tag, attrs, children }) => {
      const element = document.createElement(tag);
      Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
      if (children) element.textContent = children;
      document.head.appendChild(element);
    });
  }, [pathname]);

  return null;
}
