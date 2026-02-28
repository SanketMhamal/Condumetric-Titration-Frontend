import "./globals.css";

export const metadata = {
  title: "Conductometric Titration Analyzer",
  description:
    "Determine the equivalence point and intersection angle in conductometric titrations using the Method of Least Squares Fit.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
