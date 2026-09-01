import nextPlugin from "@next/eslint-plugin-next";

const eslintConfig = [
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  nextPlugin.configs["core-web-vitals"],
  {
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
