import config from "@/config";

/**
 * schema.org `Person` for the site author, shared by every JSON-LD block so
 * search engines resolve them to the same entity via `@id`.
 */
export function getPersonSchema() {
  const { site, socials } = config;
  const sameAs = socials
    .map(({ url }) => url)
    .filter(url => url.startsWith("http"));

  return {
    "@type": "Person",
    "@id": new URL("/#person", site.url).href,
    name: site.author,
    url: site.profile ?? site.url,
    ...(sameAs.length > 0 && { sameAs }),
  };
}
