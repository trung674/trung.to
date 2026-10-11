import type { APIRoute } from "astro";
import { type CollectionEntry, getCollection } from "astro:content";
import { getSortedPosts } from "@/utils/getSortedPosts";
import { getPostSlug, getPostUrl } from "@/utils/getPostPaths";

export async function getStaticPaths() {
  const posts = await getCollection("posts");

  return getSortedPosts(posts).map(post => ({
    params: { slug: getPostSlug(post.id, post.filePath).replace(/^\/+/, "") },
    props: post,
  }));
}

export const GET: APIRoute = ({ props, site }) => {
  const { id, filePath, data, body } = props as CollectionEntry<"posts">;
  const url = new URL(getPostUrl(id, filePath), site).href;

  const markdown = [
    `# ${data.title}`,
    "",
    `> ${data.description}`,
    "",
    `- Author: ${data.author}`,
    `- Published: ${data.pubDatetime.toISOString().slice(0, 10)}`,
    ...(data.modDatetime
      ? [`- Updated: ${data.modDatetime.toISOString().slice(0, 10)}`]
      : []),
    `- Tags: ${data.tags.join(", ")}`,
    `- URL: ${url}`,
    "",
    body?.trim() ?? "",
    "",
  ].join("\n");

  return new Response(markdown, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
