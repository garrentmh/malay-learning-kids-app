export const metadata = {
  title: "Malay Mouse 🧀",
  description: "Fun Malay (Bahasa Malaysia) practice for champs 🐭",
};
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
