import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    // three.js code mutates scene objects and syncs props into state on purpose
    files: ["src/threejs/**"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "fastapi/**"]),
]);
