import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostMarkdownUrl } from "@/utils/getPostPaths";
import config from "@/config";

export const GET: APIRoute = async ({ site }) => {
  const posts = getSortedPosts(await getCollection("posts"));
  const abs = (path: string) => new URL(path, site).href;

  const lines = [
    `# ${config.site.title}`,
    "",
    `> ${config.site.description}`,
    "",
    `Author: ${config.site.author}. All posts are also available as plain markdown at the links below, and in a single file at ${abs("llms-full.txt")}.`,
    "",
    "## Posts",
    "",
    ...posts.map(
      ({ id, filePath, data }) =>
        `- [${data.title}](${abs(getPostMarkdownUrl(id, filePath))}): ${data.description}`
    ),
    "",
    "## Optional",
    "",
    `- [About](${abs("about/")})`,
    `- [RSS feed](${abs("rss.xml")})`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
