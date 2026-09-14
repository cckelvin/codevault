import "./globals.css";

export const metadata = {
  title: "CodeVault",
  description: "View, edit, manage and push your code to GitHub.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}