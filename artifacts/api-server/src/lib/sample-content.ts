import { randomUUID } from "node:crypto";
import { HttpError } from "./supabase";
import { requireSampleRole, type SampleIdentity } from "./sample-accounts";
import type { SampleBlogPost, SampleBlogPostInput } from "@workspace/api-zod";

let posts: SampleBlogPost[] = [];

function ordered(items: SampleBlogPost[]) {
  return [...items].sort((a, b) => {
    const dateOrder = (b.publishedAt ?? b.updatedAt).getTime() - (a.publishedAt ?? a.updatedAt).getTime();
    return dateOrder || a.title.localeCompare(b.title);
  });
}

export function listPublicSampleBlog() {
  return { sample: true as const, posts: ordered(posts.filter(post => post.status === "published")) };
}

export function listAdminSampleBlog(identity: SampleIdentity) {
  requireSampleRole(identity, ["admin"]);
  return { sample: true as const, posts: ordered(posts) };
}

export function createSampleBlogPost(identity: SampleIdentity, input: SampleBlogPostInput) {
  requireSampleRole(identity, ["admin"]);
  if (posts.some(post => post.slug === input.slug)) throw new HttpError(409, "A sample blog post already uses this slug.");
  const now = new Date();
  const post: SampleBlogPost = {
    ...input, id: `sample-blog-${randomUUID()}`, createdAt: now, updatedAt: now,
    publishedAt: input.status === "published" ? now : null,
  };
  posts = ordered([...posts, post]);
  return post;
}

export function updateSampleBlogPost(identity: SampleIdentity, id: string, input: SampleBlogPostInput) {
  requireSampleRole(identity, ["admin"]);
  const current = posts.find(post => post.id === id);
  if (!current) throw new HttpError(404, "Sample blog post not found.");
  if (posts.some(post => post.id !== id && post.slug === input.slug)) throw new HttpError(409, "A sample blog post already uses this slug.");
  const now = new Date();
  const post: SampleBlogPost = {
    ...input, id, createdAt: current.createdAt, updatedAt: now,
    publishedAt: input.status === "draft" ? null : (current.publishedAt ?? now),
  };
  posts = ordered(posts.map(existing => existing.id === id ? post : existing));
  return post;
}

export function resetSampleContentData() {
  posts = [];
}
