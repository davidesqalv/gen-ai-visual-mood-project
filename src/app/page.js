import Image from "next/image";
import styles from "./page.module.css";

import HomePage from "./page-client";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <h1 style={{ fontFamily: "var(--shrk)", fontWeight: "400" }}>
          Mega shader test
        </h1>
      </div>
      <HomePage />
    </main>
  );
}
