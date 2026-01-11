'use server';

import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/lib/client";

const MARKDOWN_QUERY = defineQuery(`*[
  _type == "docPage" &&
  _id == $docId
][0]{
  body,
  linkedPost->{body, externalSource}
}`);

/**
 * Fetch markdown content from an external URL
 */
async function fetchExternalContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } })
    if (!response.ok) return null
    return await response.text()
  } catch {
    return null
  }
}

export async function getMarkdown(docId: string): Promise<string> {
  const doc = await sanityFetch({
    query: MARKDOWN_QUERY,
    params: { docId },
    tags: ['docPage'],
  }) as {
    body: string;
    linkedPost?: { body: string; externalSource?: string };
  } | null;

  if (!doc) {
    throw new Error('Document not found');
  }

  // If linked post has external source, fetch from there
  if (doc.linkedPost?.externalSource) {
    const externalContent = await fetchExternalContent(doc.linkedPost.externalSource);
    return externalContent || doc.linkedPost.body || doc.body;
  }

  return doc.linkedPost?.body || doc.body;
}
