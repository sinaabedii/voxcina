import { BlogBlock } from "@/types/blog";

/** Stable DOM id for a block — used to anchor the TOC's smooth-scroll targets. */
export function getBlockId(block: BlogBlock, index: number): string {
  return block.id || `block-${block.order ?? index}`;
}

export interface HeadingItem {
  id: string;
  text: string;
  level: 2;
}

const LEVEL_BY_TYPE: Record<string, 2> = {
  header: 2,
};

/** Extracts the header blocks as a flat table of contents. */
export function getHeadingItems(blocks: BlogBlock[] = []): HeadingItem[] {
  return blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.type in LEVEL_BY_TYPE && block.text)
    .map(({ block, index }) => ({
      id: getBlockId(block, index),
      text: block.text as string,
      level: LEVEL_BY_TYPE[block.type],
    }));
}
