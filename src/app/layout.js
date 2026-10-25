import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import "font-awesome/css/font-awesome.min.css";
import { Inter, Shrikhand } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const shrk = Shrikhand({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--shrk",
});

export const metadata = {
  title: "aurashader",
  description:
    "Tell it how you feel and a moody agent writes a one-of-a-kind animated shader for your mood, live in the browser.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${shrk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
