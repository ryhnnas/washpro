import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import LandingPage from './pages/LandingPage';

// Only the public landing page is rendered at build time. The account app
// continues to mount its existing client root and use its authentication flow.
export function renderLandingPage() {
  return renderToStaticMarkup(
    <StaticRouter location="/">
      <LandingPage />
    </StaticRouter>,
  );
}
