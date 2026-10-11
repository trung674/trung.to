import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostUrl } from "@/utils/getPostPaths";
import config from "@/config";

export const GET: APIRoute = async ({ site }) => {
  const posts = getSortedPosts(await getCollection("posts"));

  const sections = posts.map(({ id, filePath, data, body }) =>
    [
      `# ${data.title}`,
      "",
      `> ${data.description}`,
      "",
      `- Author: ${data.author}`,
      `- Published: ${data.pubDatetime.toISOString().slice(0, 10)}`,
      `- URL: ${new URL(getPostUrl(id, filePath), site).href}`,
      "",
      body?.trim() ?? "",
    ].join("\n")
  );

  const header = `# ${config.site.title}\n\n> ${config.site.description}`;

  return new Response([header, ...sections].join("\n\n---\n\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
