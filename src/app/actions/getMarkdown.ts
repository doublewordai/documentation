'use server';

import { defineQuery } from "next-sanity";
import { sanityFetch } from "@/sanity/lib/live";

const MARKDOWN_QUERY = defineQuery(`*[
  _type == "docPage" &&
  _id == $docId
][0]{
  body,
  linkedPost->{body}
}`);

export async function getMarkdown(docId: string): Promise<string> {
  const { data: doc } = await sanityFetch({
    query: MARKDOWN_QUERY,
    params: { docId },
  });

  if (!doc) {
    throw new Error('Document not found');
  }

  return doc.linkedPost?.body || doc.body;
}
