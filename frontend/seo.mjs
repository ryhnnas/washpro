export const siteUrl = 'https://washpro.my.id/';
export const seoTitle = 'WashPro — Aplikasi Kasir Laundry Online';
export const seoDescription = 'Aplikasi kasir laundry online untuk kiloan dan satuan. Kelola pesanan, pelanggan, staf, dan laporan pendapatan dengan WashPro. Coba gratis 7 hari.';

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteUrl}#organization`,
      name: 'WashPro',
      url: siteUrl,
      logo: `${siteUrl}logo.png`,
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}#website`,
      name: 'WashPro',
      url: siteUrl,
      inLanguage: 'id-ID',
      publisher: { '@id': `${siteUrl}#organization` },
    },
    {
      '@type': 'WebApplication',
      '@id': `${siteUrl}#application`,
      name: 'WashPro',
      url: siteUrl,
      description: seoDescription,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: 'id-ID',
      publisher: { '@id': `${siteUrl}#organization` },
      featureList: ['Kasir laundry kiloan dan satuan', 'Tracking pesanan', 'Manajemen pelanggan dan staf', 'Laporan pendapatan', 'Nota digital WhatsApp'],
    },
  ],
};

export function getSeoTags(isPublic = true) {
  const tags = isPublic ? [
    { tag: 'title', children: seoTitle },
    { tag: 'meta', attrs: { name: 'description', content: seoDescription } },
    { tag: 'meta', attrs: { name: 'robots', content: 'index, follow, max-image-preview:large' } },
    { tag: 'link', attrs: { rel: 'canonical', href: siteUrl } },
    { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
    { tag: 'meta', attrs: { property: 'og:site_name', content: 'WashPro' } },
    { tag: 'meta', attrs: { property: 'og:locale', content: 'id_ID' } },
    { tag: 'meta', attrs: { property: 'og:title', content: seoTitle } },
    { tag: 'meta', attrs: { property: 'og:description', content: seoDescription } },
    { tag: 'meta', attrs: { property: 'og:url', content: siteUrl } },
    { tag: 'meta', attrs: { property: 'og:image', content: `${siteUrl}logo.png` } },
    { tag: 'meta', attrs: { property: 'og:image:type', content: 'image/png' } },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '256' } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '256' } },
    { tag: 'meta', attrs: { property: 'og:image:alt', content: 'Logo WashPro, aplikasi kasir laundry online' } },
    { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary' } },
    { tag: 'meta', attrs: { name: 'twitter:title', content: seoTitle } },
    { tag: 'meta', attrs: { name: 'twitter:description', content: seoDescription } },
    { tag: 'meta', attrs: { name: 'twitter:image', content: `${siteUrl}logo.png` } },
    { tag: 'meta', attrs: { name: 'twitter:image:alt', content: 'Logo WashPro' } },
    { tag: 'script', attrs: { type: 'application/ld+json' }, children: JSON.stringify(structuredData).replace(/</g, '\\u003c') },
  ] : [
    { tag: 'title', children: 'WashPro — Akun Laundry' },
    { tag: 'meta', attrs: { name: 'robots', content: 'noindex, follow' } },
  ];
  return tags.map((item) => ({ ...item, attrs: { ...item.attrs, 'data-washpro-seo': '' }, injectTo: 'head' }));
}
