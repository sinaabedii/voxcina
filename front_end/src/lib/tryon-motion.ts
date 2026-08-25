import { Variants } from "framer-motion";

/**
 * The fitting room's panels fade in one after another: the column carries
 * `containerVariants` and every card inside it defines `itemVariants`, which
 * framer-motion drives from the parent's variant label.
 */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};
